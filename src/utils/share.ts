export const shareLocation = async (title: string, url?: string) => {
    const shareUrl = url || window.location.href;

    // Check if Web Share API is available
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                url: shareUrl
            });
            return true;
        } catch (err) {
            // User cancelled or share failed
            if ((err as Error).name === 'AbortError') {
                return false;
            }
            // Fall through to clipboard copy
        }
    }

    // Fallback to clipboard
    try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
};
