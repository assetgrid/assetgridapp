import axios from "axios";
import * as React from "react";
import { Account } from "../../../models/account";
import { SearchGroup, SearchRequest, SearchResponse } from "../../../models/search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api } from "../../../lib/ApiClient";
import { debounce } from "../../../lib/Utils";

interface Props {
    label?: string,
    value: number | Account | null,
    disabled: boolean,
    allowNull: boolean,
    onChange: (account: Account | null) => void;
    nullSelectedText?: string;
}

export default function InputAccount(props: Props) {
    let text: string;
    const [account, setAccount] = React.useState<Account | null>(props.value !== null && typeof (props.value) !== "number" ? props.value : null);
    if (props.value == null) {
        if (props.nullSelectedText) {
            text = props.nullSelectedText;
        } else {
            text = "Select Account";
        }
    } else if (account == null) {
        text = "#" + props.value + " …";
    } else {
        text = "#" + account.id + " " + account.name;
    }

    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dropdownOptions, setDropdownOptions] = React.useState<Account[] | null>(null);
    const selectedAccountId = account?.id ?? props.value as number;

    // Fetch the account based on the id in the props, if none is available
    React.useEffect(() => {
        if (props.value !== null && typeof (props.value) === "number" && (account === null || props.value !== account.id)) {
            // An id was provided. Fetch the account
            updateAccount();
        }
    }, [props.value]);

    // Fetch dropdown options
    React.useEffect(() => {
        refreshDropdownDebounced(searchQuery);
    }, [searchQuery]);

    const refreshDropdownDebounced = React.useCallback(debounce(refreshDropdown, 300), []);

    return <div className="field" tabIndex={0}
        onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
    >
        {/* Label */}
        {props.label !== undefined && <label className="label">{props.label}</label>}

        <div className={"dropdown is-fullwidth" + (open && ! props.disabled  ? " is-active" : "")}>
            <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" onClick={() => setOpen(true) } disabled={props.disabled}>
                    <span>{text}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faAngleDown} />
                    </span>
                </button>
                {props.allowNull && !props.disabled && props.value !== null && <button className="button"
                    onClick={() => setSelectedAccount(null)}
                    disabled={props.disabled}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faXmark} />
                    </span>
                </button>}
            </div>
            <div className={"dropdown-menu"} role="menu">
                <div className="dropdown-content">
                    <input
                        className="dropdown-item"
                        style={{border: "0"}}
                        type="text"
                        placeholder="Search for account"
                        value={searchQuery}
                        disabled={props.disabled}
                        onChange={e => setSearchQuery(e.target.value ) }
                    />
                    <hr className="dropdown-divider" />
                    {dropdownOptions == null && <div className="dropdown-item">Loading suggestions…</div>}
                    {dropdownOptions?.map(option => <a
                        className={"dropdown-item" + (selectedAccountId == option.id ? " is-active" : "")}
                        key={option.id}
                        onClick={() => setSelectedAccount(option) }>
                        #{option.id} {option.name}
                    </a>)}
                </div>
            </div>
        </div>
    </div>;

    /**
     * Selects no account
     */
    function setSelectedAccount(account: Account | null) {
        setAccount(account);
        setSearchQuery("");
        setOpen(false);
        props.onChange(account)
    }

    function refreshDropdown(searchQuery: string) {
        var query: any = searchQuery == ""
            ? null
            : {
                type: 0,
                children: [
                    {
                        type: 2,
                        query: {
                            column: "Id",
                            operator: 0,
                            value: Number(searchQuery.replace(/\D/g,'')),
                        }
                    },
                    {
                        type: 2,
                        query: {
                            column: "Name",
                            operator: 1,
                            value: searchQuery,
                        }
                    }
                ]
            } as SearchGroup;
        Api.Account.search({
            from: 0,
            to: 5,
            query: query
        } as SearchRequest).then(result => {
            setDropdownOptions(result.data);
        });
    }

    /**
     * Fetch the selected account, if it hasn't yet been fetched
     */
    function updateAccount() {
        Api.Account.search({
            from: 0,
            to: 1,
            query: {
                type: 2,
                query: {
                    column: "Id",
                    operator: 0,
                    value: props.value as number,
                }
            },
        } as SearchRequest).then(result => {
            if (result.totalItems == 0)
            {
                // No items found. Reset the selection
                props.onChange(null);
            }
            else
            {
                setAccount(result.data[0]);
            }
        })
    }
}