import axios from "axios";
import * as React from "react";
import { Account } from "../../../models/account";
import { SearchGroup, SearchRequest, SearchResponse } from "../../../models/search";

export interface InputAccountProps {
    label: string,
    value: number | null,
    disabled: boolean,
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
            axios.post<SearchResponse<Account>>(`https://localhost:7262/Account/Search`, {
                from: 0,
                to: 1,
                query: {
                    type: 2,
                    query: {
                        column: "Id",
                        operator: 0,
                        value: this.props.value.toString(),
                    }
                },
            } as SearchRequest).then(res => {
                if (res.data.totalItems == 0)
                {
                    this.props.onChange(null);
                }
                else
                {
                    this.setState({
                        value: res.data.data[0]
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
            <label className="label">{this.props.label}</label>
            <div className={"dropdown is-fullwidth" + (this.state.open ? " is-active" : "")}>
                <div className="dropdown-trigger">
                    <button className="button" aria-haspopup="true" onClick={e => this.setState({ open: true }) }>
                        <span>{value}</span>
                        <span className="icon is-small">
                            <i className="fas fa-angle-down" aria-hidden="true"></i>
                        </span>
                    </button>
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
        axios.post<SearchResponse<Account>>(`https://localhost:7262/Account/Search`, {
            from: 0,
            to: 5,
            query: query
        } as SearchRequest).then(res => {
            this.setState({
                dropdownOptions: res.data.data
            });
        })
    }
}