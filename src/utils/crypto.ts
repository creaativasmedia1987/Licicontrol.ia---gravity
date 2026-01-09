/**
 * Generates a SHA-256 hash from a given text string.
 * @param text The input string to hash.
 * @returns A promise that resolves to the hex string representation of the hash.
 */
export async function generateHash(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
