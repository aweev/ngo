// Use the English file as the "Schema" for types
import en from '../../messages/en.json';

type Messages = typeof en;

declare global {
    // Use type safe message keys with `next-intl`
    type IntlMessages = Messages
}