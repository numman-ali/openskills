import trash from 'trash';
import { rmSync } from 'fs';

/**
 * Safely delete files or directories with option for trash vs permanent deletion
 * @param paths - Array of file/directory paths to delete
 * @param permanent - Whether to permanently delete instead of moving to trash
 * @returns Promise<boolean> indicating success/failure
 */
export async function safeDelete(paths: string[], permanent: boolean): Promise<boolean> {
  try {
    if (permanent) {
      for (const path of paths) {
        rmSync(path, { recursive: true, force: true });
      }
    } else {
      await trash(paths);
    }
    
    const action = permanent ? 'Permanently removed' : 'Moved to trash';
    console.log(`✅ ${action}: ${paths.join(', ')}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to delete ${paths.join(', ')}: ${errorMessage}`);
    return false;
  }
}