import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeDelete } from '../../src/utils/trash.js';
import { rmSync } from 'fs';
import { platform } from 'os';
import trash from 'trash';

// Mock the dependencies
vi.mock('fs', () => ({
  rmSync: vi.fn(),
}));

vi.mock('trash', () => ({
  default: vi.fn(),
}));

// Use cross-platform test paths
const getTestPaths = () => {
  if (platform() === 'win32') {
    return ['C:\\temp\\test1', 'C:\\temp\\test2'];
  }
  return ['/tmp/test1', '/tmp/test2'];
};

describe('safeDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move files to trash when permanent is false', async () => {
    const testPaths = getTestPaths();
    (trash as any).mockResolvedValue(undefined);

    const result = await safeDelete(testPaths, false);

    expect(result).toBe(true);
    expect(trash).toHaveBeenCalledWith(testPaths);
    expect(rmSync).not.toHaveBeenCalled();
  });

  it('should permanently delete files when permanent is true', async () => {
    const testPaths = getTestPaths().slice(0, 1); // Use single path
    (rmSync as any).mockImplementation(() => {});

    const result = await safeDelete(testPaths, true);

    expect(result).toBe(true);
    expect(rmSync).toHaveBeenCalledTimes(testPaths.length);
    testPaths.forEach(path => {
      expect(rmSync).toHaveBeenCalledWith(path, { recursive: true, force: true });
    });
    expect(trash).not.toHaveBeenCalled();
  });

  it('should return false and log error when trash fails', async () => {
    const testPaths = getTestPaths().slice(0, 1);
    const errorMessage = 'Trash failed';
    (trash as any).mockRejectedValue(new Error(errorMessage));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await safeDelete(testPaths, false);
    
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Failed to delete ${testPaths.join(', ')}: ${errorMessage}`
    );
    consoleErrorSpy.mockRestore();
  });

  it('should return false and log error when permanent deletion fails', async () => {
    const testPaths = getTestPaths().slice(0, 1);
    const errorMessage = 'Permission denied';
    (rmSync as any).mockImplementation(() => { throw new Error(errorMessage); });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await safeDelete(testPaths, true);
    
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Failed to delete ${testPaths.join(', ')}: ${errorMessage}`
    );
    consoleErrorSpy.mockRestore();
  });

  it('should handle empty paths array', async () => {
    // Mock trash to succeed even with empty array
    (trash as any).mockResolvedValue(undefined);
    
    const result = await safeDelete([], false);
    expect(result).toBe(true);
    expect(trash).toHaveBeenCalledWith([]);
  });
});
