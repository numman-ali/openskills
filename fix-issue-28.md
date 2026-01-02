# fix issue 28
https://github.com/numman-ali/openskills/issues/28



# fix windows install failure


giggitygi commented 2 days ago


Prerequisites
Make sure you have cloned the openkills source code:

Step 1: Modify install.ts
File path: src/commands/install.ts

Three modifications are needed to change the hard coded '/' to path.sep:

1.1 Add import (at the beginning of the file)

diff

import { join, basename, resolve } from 'path';
import { join, basename, resolve, sep } from 'path';
1.2 Modify near line 197
diff

if (!resolvedTargetPath.startsWith(resolvedTargetDir + '/')) {
if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
1.3 Modify near line 247
diff

if (!resolvedTargetPath.startsWith(resolvedTargetDir + '/')) {
if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
1.4 Modify near line 373
diff

if (!resolvedTargetPath.startsWith(resolvedTargetDir + '/')) {
if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
Step 2: Compile TypeScript
npm run build
This will compile the modified install.ts into JavaScript.
Step 3: Replace global commands
npm link
This will link the openkills in the current directory to the global level, replacing the previously installed version.

Step 4: Verification
openskills install anthropics/skills
It should be able to install normally now!