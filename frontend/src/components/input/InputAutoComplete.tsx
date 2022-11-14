import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../lib/ApiClient";
import { classList, debounce } from "../../lib/Utils";
import DropdownContent from "../common/DropdownContent";
import { useTranslation } from "react-i18next";

type Props = {
    label?: string
    disabled: boolean
    errors?: string[]
    refreshSuggestions: (api: Api, prefix: string) => Promise<string[]>
    maxItems?: number
    fullwidth?: boolean
    helpText?: string
    isSmall?: boolean
} & ({
    allowNull: true
    nullText: string
    value: string | null
    onChange: (value: string | null) => void
} | {
    allowNull: false
    value: string
    onChange: (value: string) => void
});

export default function InputAutoComplete (props: Props): React.ReactElement {
    const [open, setOpen] = React.useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = React.useState<string[] | null>(null);
    const api = useApi();
    const isError = props.errors !== undefined && props.errors.length > 0;
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    React.useEffect(() => {
        if (props.value === "" || props.value === null) {
            // Don't suggest anything if nothing has been entered
            setOpen(false);
            setAutocompleteSuggestions(null);
        } else if (api !== null) {
            refreshSuggestionsDebounced(api, props.value);
        }
    }, [api, props.value]);
    const refreshSuggestionsDebounced = React.useCallback(debounce(refreshSuggestions, 300), []);

    const fullwidth = props.fullwidth !== false;
    if (props.value === null) {
        return <div className="field">
            {props.label !== undefined && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className={"control " + classList({ "is-enabled": !props.disabled })}>
                    <span style={props.disabled ? { color: "#999" } : { cursor: "pointer" }}
                        className={"input " + classList({ "is-small": props.isSmall })}
                        onClick={() => !props.disabled && props.onChange("")}>
                        {props.allowNull ? props.nullText : ""}
                    </span>
                    {props.helpText !== undefined && <p className="help">
                        {props.helpText}
                    </p>}
                </div>
            </div>
        </div>;
    }

    return <div className="field" onBlur={onBlur}>
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className={"dropdown " + classList({ "is-danger": isError, "is-fullwidth": fullwidth, "is-active": open && !props.disabled })}>
            <div className="dropdown-trigger">
                <input className={"input " + classList({ "is-small": props.isSmall })}
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={prefixChanged} />

                {!props.disabled && (props.value !== "" || props.allowNull) && <button
                    className={"button  " + classList({ "is-small": props.isSmall })}
                    onClick={() => { setOpen(false); props.onChange(props.allowNull ? null! : ""); }}
                    disabled={props.disabled}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faXmark} />
                    </span>
                </button>}
            </div>
            <DropdownContent active={open} fullWidth={true}>
                <div className={"dropdown-menu"} role="menu" tabIndex={0} ref={dropdownRef}>
                    <div className="dropdown-content">
                        {autocompleteSuggestions == null && <div className="dropdown-item">{t("common.loading_suggestions")}</div>}
                        {autocompleteSuggestions?.map(suggestion => <a
                            className={"dropdown-item"}
                            key={suggestion}
                            onClick={() => { setOpen(false); props.onChange(suggestion); }} >
                            {suggestion}
                        </a>)}
                    </div>
                </div>
            </DropdownContent>
        </div>
        {isError && <p className="help has-text-danger">
            {props.errors![0]}
        </p>}
        {props.helpText !== undefined && <p className="help">
            {props.helpText}
        </p>}
    </div>;

    function prefixChanged (e: React.ChangeEvent<HTMLInputElement>): void {
        if (!open) {
            // Clear autocomplete suggestions before showing, as they could contain content from a previous input
            setAutocompleteSuggestions(null);
        }
        setOpen(true);
        props.onChange(e.target.value);
    }

    async function refreshSuggestions (api: Api, prefix: string): Promise<void> {
        if (prefix !== "" && api !== null) {
            const result = await props.refreshSuggestions(api, prefix);
            setAutocompleteSuggestions(result.slice(0, props.maxItems ?? 5));
        }
    }

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
            setAutocompleteSuggestions(null);
        }
    }
}
