import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  useEffect,
  useRef,
  makeTheme,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isNumberKey,
  isEnterKey,
  isBackspaceKey,
  ValidationError,
  Separator,
  type Theme,
  type Status,
  type Keybinding,
  type KeypressEvent,
} from '@inquirer/core';
import { cursorHide } from '@inquirer/ansi';
import type { PartialDeep } from '@inquirer/type';
import { styleText } from 'node:util';
import figures from '@inquirer/figures';
import fuzzysort from 'fuzzysort';

type SearchableCheckboxTheme = {
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
  };
  style: {
    disabledChoice: (text: string) => string;
    renderSelectedChoices: <T>(
      selectedChoices: ReadonlyArray<NormalizedChoice<T>>,
      allChoices: ReadonlyArray<NormalizedChoice<T> | Separator>,
    ) => string;
    description: (text: string) => string;
    keysHelpTip: (keys: [key: string, action: string][]) => string | undefined;
  };
  keybindings: ReadonlyArray<Keybinding>;
};

type CheckboxShortcuts = {
  all?: string | null;
  invert?: string | null;
};

type Choice<Value> = {
  value: Value;
  name?: string;
  checkedName?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
  type?: never;
};

type NormalizedChoice<Value> = {
  value: Value;
  name: string;
  checkedName: string;
  description?: string;
  short: string;
  disabled: boolean | string;
  checked: boolean;
};

type SearchableCheckboxConfig<
  Value,
  ChoicesObject =
    | ReadonlyArray<string | Separator>
    | ReadonlyArray<Choice<Value> | Separator>,
> = {
  message: string;
  prefix?: string;
  pageSize?: number;
  choices: ChoicesObject extends ReadonlyArray<string | Separator>
    ? ChoicesObject
    : ReadonlyArray<Choice<Value> | Separator>;
  loop?: boolean;
  required?: boolean;
  validate?: (
    choices: readonly NormalizedChoice<Value>[],
  ) => boolean | string | Promise<string | boolean>;
  theme?: PartialDeep<Theme<SearchableCheckboxTheme>>;
  shortcuts?: CheckboxShortcuts;
  searchKey?: string;
  clearSearchKey?: string;
};

type Item<Value> = NormalizedChoice<Value> | Separator;


const checkboxTheme: SearchableCheckboxTheme = {
  icon: {
    checked: styleText('green', figures.circleFilled),
    unchecked: figures.circle,
    cursor: figures.pointer,
  },
  style: {
    disabledChoice: (text: string) => styleText('dim', `- ${text}`),
    renderSelectedChoices: (selectedChoices) =>
      selectedChoices.map((choice) => choice.short).join(', '),
    description: (text: string) => styleText('cyan', text),
    keysHelpTip: (keys: [string, string][]) =>
      keys
        .map(([key, action]) => `${styleText('bold', key)} ${styleText('dim', action)}`)
        .join(styleText('dim', ' • ')),
  },
  keybindings: [],
};

function isSelectable<Value>(item: Item<Value>): item is NormalizedChoice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

function isChecked<Value>(item: Item<Value>): item is NormalizedChoice<Value> {
  return isSelectable(item) && item.checked;
}

function toggle<Value>(item: Item<Value>): Item<Value> {
  return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked: boolean) {
  return function <Value>(item: Item<Value>): Item<Value> {
    return isSelectable(item) ? { ...item, checked } : item;
  };
}

function normalizeChoices<Value>(
  choices: ReadonlyArray<string | Separator> | ReadonlyArray<Choice<Value> | Separator>,
): Item<Value>[] {
  return choices.map((choice) => {
    if (Separator.isSeparator(choice)) return choice;

    if (typeof choice === 'string') {
      return {
        value: choice as Value,
        name: choice,
        short: choice,
        checkedName: choice,
        disabled: false,
        checked: false,
      };
    }

    const name = choice.name ?? String(choice.value);
    const normalizedChoice: NormalizedChoice<Value> = {
      value: choice.value,
      name,
      short: choice.short ?? name,
      checkedName: choice.checkedName ?? name,
      disabled: choice.disabled ?? false,
      checked: choice.checked ?? false,
    };

    if (choice.description) {
      normalizedChoice.description = choice.description;
    }

    return normalizedChoice;
  });
}

function isPrintableKey(key: KeypressEvent): boolean {
  const enriched = key as KeypressEvent & { sequence?: string; meta?: boolean };
  if (enriched.ctrl || enriched.meta) return false;
  if (!enriched.sequence) return false;
  if (enriched.sequence.length !== 1) return false;
  const charCode = enriched.sequence.charCodeAt(0);
  if (charCode === 32) return false;
  return charCode >= 32 && charCode <= 126;
}

export default createPrompt(
  <Value>(
    config: SearchableCheckboxConfig<Value>,
    done: (value: Array<Value>) => void,
  ) => {
    const { pageSize = 7, loop = true, required, validate = () => true } = config;
    const shortcuts = { all: 'a', invert: 'i', ...config.shortcuts };
    const searchKey = config.searchKey ?? 'f';
    const clearSearchKey = config.clearSearchKey ?? 'escape';
    const theme = makeTheme<SearchableCheckboxTheme>(checkboxTheme, config.theme);
    const { keybindings } = theme;
    const [status, setStatus] = useState<Status>('idle');
    const prefix = usePrefix({ status, theme });
    const [items, setItems] = useState<ReadonlyArray<Item<Value>>>(
      normalizeChoices(config.choices),
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [searchActive, setSearchActive] = useState(false);
    const preSearchActiveIndex = useRef<number | null>(null);
    const restoreActiveIndex = useRef<number | null>(null);
    const activeItemIndex = useRef<number | null>(null);

    useMemo(() => {
      const first = items.findIndex(isSelectable);
      if (first === -1) {
        throw new ValidationError(
          '[searchable checkbox] No selectable choices. All choices are disabled.',
        );
      }
      return first;
    }, [items]);

    const filteredIndexes = useMemo(() => {
      if (!searchQuery) {
        return items.map((_, index) => index);
      }

      const searchable = items
        .map((item, index) => {
          if (Separator.isSeparator(item)) return null;
          const searchText = `${item.name} ${item.description ?? ''}`.trim();
          return { index, searchText };
        })
        .filter((item): item is { index: number; searchText: string } => item !== null);

      const results = fuzzysort.go(searchQuery, searchable, { key: 'searchText' });
      return results.map((result) => result.obj.index);
    }, [items, searchQuery]);

    const filteredItems = useMemo(
      () => filteredIndexes.map((index) => items[index]!).filter(Boolean),
      [filteredIndexes, items],
    );

    const [active, setActive] = useState(0);
    const [errorMsg, setError] = useState<string>();

    useEffect(() => {
      const currentIndex = filteredIndexes[active];
      if (currentIndex !== undefined) {
        activeItemIndex.current = currentIndex;
      } else if (!searchActive) {
        activeItemIndex.current = active;
      }
    }, [active, filteredIndexes, searchActive]);

    useEffect(() => {
      if (!searchActive && restoreActiveIndex.current !== null) {
        const restoredIndex = restoreActiveIndex.current;
        restoreActiveIndex.current = null;
        if (
          restoredIndex < filteredItems.length &&
          isSelectable(filteredItems[restoredIndex]!)
        ) {
          setActive(restoredIndex);
          return;
        }
      }

      if (filteredItems.length === 0) {
        if (active !== 0) setActive(0);
        return;
      }
      const firstSelectable = filteredItems.findIndex(isSelectable);
      if (firstSelectable === -1) {
        if (active !== 0) setActive(0);
        return;
      }
      if (active >= filteredItems.length || !isSelectable(filteredItems[active]!)) {
        setActive(firstSelectable);
      }
    }, [filteredItems.length, searchQuery, searchActive, active, filteredItems]);

    const bounds = useMemo(() => {
      const first = filteredItems.findIndex(isSelectable);
      let last = -1;
      for (let index = filteredItems.length - 1; index >= 0; index -= 1) {
        if (isSelectable(filteredItems[index]!)) {
          last = index;
          break;
        }
      }
      return { first, last };
    }, [filteredItems]);

    useKeypress(async (key: KeypressEvent) => {
      if (!searchActive && key.name === searchKey) {
        preSearchActiveIndex.current = activeItemIndex.current ?? null;
        setSearchActive(true);
        setSearchQuery('');
        setError(undefined);
        return;
      }

      if (searchActive) {
        if (key.name === clearSearchKey) {
          restoreActiveIndex.current = preSearchActiveIndex.current;
          preSearchActiveIndex.current = null;
          setSearchActive(false);
          setSearchQuery('');
          setError(undefined);
          return;
        }
        if (isBackspaceKey(key)) {
          setSearchQuery(searchQuery.slice(0, -1));
          setError(undefined);
          return;
        }
        if (isPrintableKey(key)) {
          const sequence = (key as KeypressEvent & { sequence?: string }).sequence ?? '';
          setSearchQuery(`${searchQuery}${sequence}`);
          setError(undefined);
          return;
        }
      }

      if (isEnterKey(key)) {
        const selection = items.filter(isChecked);
        const isValid = await validate([...selection]);
        if (required && !items.some(isChecked)) {
          setError('At least one choice must be selected');
        } else if (isValid === true) {
          setStatus('done');
          done(selection.map((choice) => choice.value));
        } else {
          setError(isValid || 'You must select a valid value');
        }
      } else if (bounds.first !== -1 && (isUpKey(key, keybindings) || isDownKey(key, keybindings))) {
        if (
          loop ||
          (isUpKey(key, keybindings) && active !== bounds.first) ||
          (isDownKey(key, keybindings) && active !== bounds.last)
        ) {
          const offset = isUpKey(key, keybindings) ? -1 : 1;
          let next = active;
          do {
            next = (next + offset + filteredItems.length) % filteredItems.length;
          } while (!isSelectable(filteredItems[next]!));
          setActive(next);
        }
      } else if (isSpaceKey(key)) {
        setError(undefined);
        const activeIndex = filteredIndexes[active];
        if (activeIndex === undefined) return;
        setItems(items.map((choice, i) => (i === activeIndex ? toggle(choice) : choice)));
      } else if (!searchActive && key.name === shortcuts.all) {
        const selectAll = items.some((choice) => isSelectable(choice) && !choice.checked);
        setItems(items.map(check(selectAll)));
      } else if (!searchActive && key.name === shortcuts.invert) {
        setItems(items.map(toggle));
      } else if (bounds.first !== -1 && isNumberKey(key)) {
        const selectedIndex = Number(key.name) - 1;

        let selectableIndex = -1;
        const position = filteredItems.findIndex((item) => {
          if (Separator.isSeparator(item)) return false;

          selectableIndex++;
          return selectableIndex === selectedIndex;
        });

        const selectedItem = filteredItems[position];
        const activeIndex = filteredIndexes[position];
        if (selectedItem && isSelectable(selectedItem) && activeIndex !== undefined) {
          setActive(position);
          setItems(items.map((choice, i) => (i === activeIndex ? toggle(choice) : choice)));
        }
      }
    });

    const message = theme.style.message(config.message, status);

    if (status === 'done') {
      const selection = items.filter(isChecked);
      const answer = theme.style.answer(
        theme.style.renderSelectedChoices(selection, items),
      );

      return [prefix, message, answer].filter(Boolean).join(' ');
    }

    let description: string | undefined;
    const page =
      filteredItems.length === 0
        ? styleText('dim', '  No matches')
        : usePagination({
            items: filteredItems,
            active,
            renderItem({ item, isActive }) {
              if (Separator.isSeparator(item)) {
                return ` ${item.separator}`;
              }

              if (item.disabled) {
                const disabledLabel =
                  typeof item.disabled === 'string' ? item.disabled : '(disabled)';
                return theme.style.disabledChoice(`${item.name} ${disabledLabel}`);
              }

              if (isActive) {
                description = item.description;
              }

              const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
              const name = item.checked ? item.checkedName : item.name;
              const color = isActive ? theme.style.highlight : (x: string) => x;
              const cursor = isActive ? theme.icon.cursor : ' ';
              return color(`${cursor}${checkbox} ${name}`);
            },
            pageSize,
            loop,
          });

    const searchHint = searchActive
      ? theme.style.highlight(searchQuery || 'type to search')
      : theme.style.defaultAnswer(searchQuery || `press ${searchKey} to search`);
    const searchLine = `${styleText('bold', 'Search:')} ${searchHint}`;

    const keys: [string, string][] = [
      ['↑↓', 'navigate'],
      ['space', 'select'],
      [searchKey, 'search'],
    ];
    if (searchActive) keys.push(['esc', 'clear']);
    if (!searchActive && shortcuts.all) keys.push([shortcuts.all, 'all']);
    if (!searchActive && shortcuts.invert) keys.push([shortcuts.invert, 'invert']);
    keys.push(['⏎', 'submit']);

    const helpLine = theme.style.keysHelpTip(keys);

    const lines = [
      [prefix, message].filter(Boolean).join(' '),
      searchLine,
      page,
      ' ',
      description ? theme.style.description(description) : '',
      errorMsg ? theme.style.error(errorMsg) : '',
      helpLine,
    ]
      .filter(Boolean)
      .join('\n')
      .trimEnd();

    return `${lines}${cursorHide}`;
  },
);

export { Separator } from '@inquirer/core';
