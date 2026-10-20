/** Let the desktop open internal pages without discarding running apps. */
export function navigateToPage(href: string) {
  const event = new CustomEvent('desktop:navigate', { detail: { href }, cancelable: true });
  if (document.dispatchEvent(event)) location.assign(href);
}
