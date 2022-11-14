import * as React from "react";
import { Account } from "../../../models/account";
import { SearchGroup } from "../../../models/search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce } from "../../../lib/Utils";
import InputButton from "../../input/InputButton";
import CreateAccountModal from "./CreateAccountModal";
import DropdownContent from "../../common/DropdownContent";
import { useTranslation } from "react-i18next";

interface Props {
    label?: string
    value: number | Account | null
    disabled: boolean
    allowNull: boolean
    onChange: (account: Account | null) => void
    nullSelectedText?: string
    allowCreateNewAccount: boolean
    errors?: string[]
}

export default function InputAccount (props: Props): React.ReactElement {
    let text: string;
    const isError = props.errors !== undefined && props.errors.length > 0;
    const [account, setAccount] = React.useState<Account | null>(props.value !== null && typeof (props.value) !== "number" ? props.value : null);
    const [creatingAccount, setCreatingAccount] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    if (props.value === null) {
        if (props.nullSelectedText !== undefined) {
            text = props.nullSelectedText;
        } else {
            text = t("common.select_account");
        }
    } else if (account == null) {
        if (typeof props.value === "number") {
            text = `# ${props.value} …`;
        } else {
            text = `# ${props.value.id} ${props.value.name}`;
        }
    } else {
        text = `# ${account.id} ${account.name}`;
    }

    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dropdownOptions, setDropdownOptions] = React.useState<Account[] | null>(null);
    const selectedAccountId = account?.id ?? props.value as number;
    const api = useApi();

    // Fetch the account based on the id in the props, if none is available
    React.useEffect(() => {
        if (props.value !== null && typeof (props.value) === "number" && (account === null || props.value !== account.id)) {
            // An id was provided. Fetch the account
            void updateAccount();
        }
    }, [api, props.value]);

    // Fetch dropdown options
    React.useEffect(() => {
        if (api !== null) {
            refreshDropdownDebounced(api, searchQuery);
        }
    }, [searchQuery, api]);

    const refreshDropdownDebounced = React.useCallback(debounce(refreshDropdown, 300), []);

    return <div className="field" onBlur={onBlur}>
        {/* Label */}
        {props.label !== undefined && <label className="label">{props.label}</label>}

        <div className={"dropdown is-fullwidth" + (open && !props.disabled ? " is-active" : "") + (isError ? " is-danger" : "")}>
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
            <DropdownContent active={open} fullWidth={true}>
                <div className={"dropdown-menu"} role="menu" ref={dropdownRef} tabIndex={0}>
                    <div className="dropdown-content">
                        <input
                            className="dropdown-item"
                            style={{ border: "0" }}
                            type="text"
                            placeholder={t("common.search_account")!}
                            value={searchQuery}
                            disabled={props.disabled || api === null}
                            onChange={e => setSearchQuery(e.target.value) }
                        />
                        <hr className="dropdown-divider" />
                        {dropdownOptions == null && <div className="dropdown-item">{t("common.loading_suggestions")}</div>}
                        {dropdownOptions?.map(option => <a
                            className={"dropdown-item" + (selectedAccountId === option.id ? " is-active" : "")}
                            key={option.id}
                            onClick={() => setSelectedAccount(option) }>
                            #{option.id} {option.name}
                        </a>)}
                        {props.allowCreateNewAccount && <>
                            <hr className="dropdown-divider" />
                            <div className="dropdown-item">
                                <InputButton
                                    disabled={props.disabled || api === null}
                                    className="is-small is-fullwidth"
                                    onClick={() => setCreatingAccount(true)}>{t("common.create_account")}</InputButton>
                            </div>
                        </>}
                    </div>
                </div>
            </DropdownContent>
        </div>
        {isError && <p className="help has-text-danger">
            {props.errors![0]}
        </p>}
        {creatingAccount && <CreateAccountModal close={() => setCreatingAccount(false)}
            closeOnChange={true}
            created={account => setSelectedAccount(account)}
            preset={{
                name: "",
                description: "",
                identifiers: [],
                includeInNetWorth: false,
                favorite: false
            }} /> }
    </div>;

    /**
     * Selects no account
     */
    function setSelectedAccount (account: Account | null): void {
        setAccount(account);
        setSearchQuery("");
        setOpen(false);
        props.onChange(account);
    }

    async function refreshDropdown (api: Api, searchQuery: string): Promise<void> {
        let query: SearchGroup | undefined;
        if (searchQuery !== "") {
            query = {
                type: 0,
                children: [
                    {
                        type: 2,
                        query: {
                            column: "Id",
                            operator: 0,
                            value: Number(searchQuery.replace(/\D/g, "")),
                            not: false
                        }
                    },
                    {
                        type: 2,
                        query: {
                            column: "Name",
                            operator: 1,
                            value: searchQuery,
                            not: false
                        }
                    }
                ]
            };
        }
        const result = await api.Account.search({
            from: 0,
            to: 5,
            query,
            descending: false,
            orderByColumn: "Id"
        });
        setDropdownOptions(result.data.data);
    }

    /**
     * Fetch the selected account, if it hasn't yet been fetched
     */
    async function updateAccount (): Promise<void> {
        if (api === null) return;

        const result = await api.Account.search({
            from: 0,
            to: 1,
            query: {
                type: 2,
                query: {
                    column: "Id",
                    operator: 0,
                    value: props.value as number,
                    not: false
                }
            },
            descending: false,
            orderByColumn: "Id"
        });

        if (result.data.totalItems === 0) {
            // No items found. Reset the selection
            props.onChange(null);
        } else {
            setAccount(result.data.data[0]);
        }
    }

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
        }
    }
}
