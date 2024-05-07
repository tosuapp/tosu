export function sanitizeText(text: string) {
    return text.replace(/[&<>"'\\/]/gim, function (i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}
