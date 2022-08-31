import axios from "axios";
import * as React from "react";
import { Account } from "../../../models/account";
import { SearchGroup, SearchRequest, SearchResponse } from "../../../models/search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api } from "../../../lib/ApiClient";

export interface InputAccountProps {
    label?: string,
    value: number | null,
    disabled: boolean,
    allowNull: boolean,
    onChange: (account: Account | null) => void;
}

interface State {
    value: Account | null,
    open: boolean,
    searchQuery: string,
    dropdownOptions: Account[] | null
}

export default class InputAccount extends React.Component<InputAccountProps, State> {
    constructor(props: InputAccountProps) {
        super(props);
        this.state = {
            value: null,
            open: false,
            searchQuery: "",
            dropdownOptions: null
        };
    }

    private requestNumber: number = 0;
    public componentDidUpdate(prevProps: Readonly<InputAccountProps>, prevState: Readonly<State>): void {
        if (this.state.searchQuery != prevState.searchQuery)
        {
            var requestNumber = ++this.requestNumber;
            setTimeout(() => {
                if (requestNumber == this.requestNumber) {
                    this.refreshDropdown();
                }
            }, 300);
        }
    }

    public componentDidMount(): void {
        this.refreshDropdown();

        if (this.props.value != null && this.state.value == null)
        {
            // Fetch the selected item
            Api.Account.search({
                from: 0,
                to: 1,
                query: {
                    type: 2,
                    query: {
                        column: "Id",
                        operator: 0,
                        value: this.props.value,
                    }
                },
            } as SearchRequest).then(result => {
                if (result.totalItems == 0)
                {
                    this.props.onChange(null);
                }
                else
                {
                    this.setState({
                        value: result.data[0]
                    });
                }
            })
        }
    }

    public render() {
        var value: string;
        if (this.props.value == null) {
            value = "Select Account";
        } else if (this.state.value == null) {
            value = "#" + this.props.value + " …";
        } else {
            value = "#" + this.state.value.id + " " + this.state.value.name;
        }
        
        return <div className="field" tabIndex={0}
            onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && this.setState({ open: false })}
            >
            {this.props.label !== undefined && <label className="label">{this.props.label}</label>}
            <div className={"dropdown is-fullwidth" + (this.state.open && ! this.props.disabled  ? " is-active" : "")}>
                <div className="dropdown-trigger">
                    <button className="button" aria-haspopup="true" onClick={e => this.setState({ open: true }) } disabled={this.props.disabled}>
                        <span>{value}</span>
                        <span className="icon is-small">
                            <FontAwesomeIcon icon={faAngleDown} />
                        </span>
                    </button>
                    {this.props.allowNull && !this.props.disabled && this.props.value !== null && <button className="button"
                        onClick={e => this.props.onChange(null)}
                        disabled={this.props.disabled}>
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
                            value={this.state.searchQuery}
                            disabled={this.props.disabled}
                            onChange={e => this.setState({ searchQuery: e.target.value }) }
                        />
                        <hr className="dropdown-divider" />
                        {this.state.dropdownOptions == null && <div className="dropdown-item">Loading suggestions…</div>}
                        {this.state.dropdownOptions?.map(option => <a
                            className={"dropdown-item" + (this.props.value == option.id ? " is-active" : "")}
                            key={option.id}
                            onClick={() => { this.setState({ value: option, open: false, searchQuery: "" }); this.props.onChange(option) }}>
                            #{option.id} {option.name}
                        </a>)}
                    </div>
                </div>
            </div>
        </div>;
    }

    private refreshDropdown()
    {
        var query: any = this.state.searchQuery == ""
            ? null
            : {
                type: 0,
                children: [
                    {
                        type: 2,
                        query: {
                            column: "Id",
                            operator: 0,
                            value: Number(this.state.searchQuery.replace(/\D/g,'')),
                        }
                    },
                    {
                        type: 2,
                        query: {
                            column: "Name",
                            operator: 1,
                            value: this.state.searchQuery,
                        }
                    }
                ]
            } as SearchGroup;
        Api.Account.search({
            from: 0,
            to: 5,
            query: query
        } as SearchRequest).then(result => {
            this.setState({
                dropdownOptions: result.data
            });
        })
    }
}