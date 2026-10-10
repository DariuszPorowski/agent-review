export function plural(count, singular, pluralForm = `${singular}s`) {
    return Number(count) === 1 ? singular : pluralForm;
}

export function countLabel(count, singular, pluralForm = `${singular}s`) {
    return `${Number(count).toLocaleString()} ${plural(count, singular, pluralForm)}`;
}
