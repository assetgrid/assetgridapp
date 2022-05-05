import axios from "axios";
import * as React from "react";
import { Account } from "../../models/account";

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
            axios.post(`https://localhost:7262/Account/Search`, {
                query: {
                    type: 2,
                    children: [],
                    query: {
                        column: "Id",
                        operator: 0,
                        value: this.props.value.toString(),
                    }
                },
            }).then(res => {
                if (res.data.length == 0)
                {
                    this.props.onChange(null);
                }
                else
                {
                    this.setState({
                        value: res.data[0]
                    });
                }
            })
        }
    }

    public render() {
        var value: string;
        if (this.state.open) {
            value = this.state.searchQuery;
        } else {
            if (this.props.value == null) {
                value = "Select Account";
            } else if (this.state.value == null) {
                value = "#" + this.props.value + " …";
            } else {
                value = "#" + this.state.value.id + " " + this.state.value.name;
            }
        }
        
        return <div className="field" tabIndex={0}
            onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && this.setState({ open: false })}
            >
            <label className="label">{this.props.label}</label>
            <div className="field has-addons">
                <div className="control is-expanded dropdown-search">
                    <input
                        className="input"
                        type="text"
                        placeholder={this.props.label}
                        value={value}
                        disabled={this.props.disabled}
                        onFocus={e => this.setState({ open: true }) }
                        onChange={e => this.setState({ searchQuery: e.target.value }) }
                    />
                    { this.state.open && this.renderDropdown() }
                </div>
            </div>
        </div>;
    }
    
    private renderDropdown()
    {
        if (this.state.dropdownOptions == null)
        {
            return <div className="dropdown">
                <div>Loading suggestions</div>
            </div>
        }

        return <div className="dropdown">
            {this.state.dropdownOptions.map(option => <div
                className="dropdown-item"
                key={option.id}
                onClick={() => { this.setState({ value: option, open: false, searchQuery: "" }); this.props.onChange(option) }}>
                #{option.id} {option.name}
            </div>)}
        </div>
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
                        children: [],
                        query: {
                            column: "Id",
                            operator: 0,
                            value: this.state.searchQuery,
                        }
                    },
                    {
                        type: 2,
                        children: [],
                        query: {
                            column: "Name",
                            operator: 1,
                            value: this.state.searchQuery,
                        }
                    }
                ]
            };
        axios.post(`https://localhost:7262/Account/Search`, {
            query: query
        }).then(res => {
            this.setState({
                dropdownOptions: res.data
            });
        })
    }
}