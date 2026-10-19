export async function openChangeDetails(page) {
    const details = page.locator("#review-background");
    await details.waitFor();
    await details.evaluate((element) => { element.open = true; });
}
