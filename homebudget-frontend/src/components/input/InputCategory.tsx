import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api } from "../../lib/ApiClient";
import { debounce } from "../../lib/Utils";

interface Props {
    label?: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
}

export default function InputCategory (props: Props) {
    const [open, setOpen] = React.useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = React.useState<string[] | null>(null);

    React.useEffect(() => {
        if (props.value === "") {
            // Don't suggest anything if nothing has been entered
            setOpen(false);
            setAutocompleteSuggestions(null);
        } else {
            refreshSuggestionsDebounced(props.value)
        }
    }, [props.value]);
    const refreshSuggestionsDebounced = React.useCallback(debounce(refreshSuggestions, 300), []);

    return <div className="field" tabIndex={0} onBlur={lostFocus}>
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className={"dropdown is-fullwidth" + (open && ! props.disabled  ? " is-active" : "")}>
            <div className="dropdown-trigger">
                <input className="input"
                    value={props.value}
                    disabled={props.disabled}
                    onChange={prefixChanged} />
                {!props.disabled && props.value !== "" && <button className="button"
                    onClick={() => { setOpen(false); props.onChange(""); }}
                    disabled={props.disabled}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faXmark} />
                    </span>
                </button>}
            </div>
            <div className={"dropdown-menu"} role="menu">
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
        </div>
    </div>;

    function prefixChanged(e: React.ChangeEvent<HTMLInputElement>) {
        if (!open) {
            // Clear autocomplete suggestions before showing, as they could contain content from a previous input
            setAutocompleteSuggestions(null);
        }
        setOpen(true);
        props.onChange(e.target.value);
    }
    
    function lostFocus(e: React.FocusEvent<HTMLDivElement, Element>) {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setOpen(false);
            setAutocompleteSuggestions(null);
        }
    }

    function refreshSuggestions(prefix: string)
    {
        if (prefix !== "") {
            Api.Taxonomy.categoryAutocomplete(prefix).then(result => {
                setAutocompleteSuggestions(result);
            })
        }
    }
}