import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import { forget } from "./lib/Utils";

async function init (): Promise<void> {
    await i18n
        .use(Backend)
        .use(initReactI18next) // passes i18n down to react-i18next
        .init({
            fallbackLng: "en",
            lng: "da",
            debug: false,
            interpolation: {
                escapeValue: false // react already safe from xss
            },
            backend: {
                loadPath: "/dist/locales/{{lng}}/{{ns}}.json"
            }
        });
}
forget(init)();

export default i18n;
