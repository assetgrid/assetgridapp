import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../lib/ApiClient";
import { debounce } from "../../lib/Utils";
import DropdownContent from "../common/DropdownContent";

type Props = {
    label?: string;
    disabled: boolean;
    errors?: string[];
    refreshSuggestions: (api: Api, prefix: string) => Promise<string[]>;
    maxItems?: number;
    fullwidth?: boolean;
    helpText?: string;
} & ({
    allowNull: true;
    nullText: string;
    value: string | null;
    onChange: (value: string | null) => void;
} | {
    allowNull: false;
    value: string;
    onChange: (value: string) => void;
});

export default function InputAutoComplete (props: Props) {
    const [open, setOpen] = React.useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = React.useState<string[] | null>(null);
    const api = useApi();
    const isError = props.errors !== undefined && props.errors.length > 0;
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (props.value === "" || props.value === null) {
            // Don't suggest anything if nothing has been entered
            setOpen(false);
            setAutocompleteSuggestions(null);
        } else if (api !== null) {
            refreshSuggestionsDebounced(api, props.value)
        }
    }, [api, props.value]);
    const refreshSuggestionsDebounced = React.useCallback(debounce(refreshSuggestions, 300), []);

    if (props.value === null) {
        return <div className="field">
            {props.label && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className={"control" + (props.fullwidth ? " is-expanded" : "")}>
                    <span style={props.disabled ? { color: "#999"} : { cursor: "pointer" }}
                        className="input"
                        onClick={() => ! props.disabled && props.onChange("")}>
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
        <div className={"dropdown" + (props.fullwidth ? " is-n" : "") + (open && ! props.disabled  ? " is-active" : "") + (isError ? " is-danger" : "")}>
            <div className="dropdown-trigger">
                <input className="input"
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={prefixChanged} />
                {!props.disabled && (props.value !== "" || props.allowNull) && <button className="button"
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
                        {autocompleteSuggestions == null && <div className="dropdown-item">Loading suggestions…</div>}
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

    function prefixChanged(e: React.ChangeEvent<HTMLInputElement>) {
        if (!open) {
            // Clear autocomplete suggestions before showing, as they could contain content from a previous input
            setAutocompleteSuggestions(null);
        }
        setOpen(true);
        props.onChange(e.target.value);
    }

    async function refreshSuggestions(api: Api, prefix: string) {
        if (prefix !== "" && api !== null) {
            let result = await props.refreshSuggestions(api, prefix);
            setAutocompleteSuggestions(result.slice(0, props.maxItems ?? 5));
        }
    }

    function onBlur(e: React.FocusEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !dropdownRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
            setAutocompleteSuggestions(null);
        }
    }
}