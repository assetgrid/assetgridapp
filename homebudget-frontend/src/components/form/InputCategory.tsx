import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api } from "../../lib/ApiClient";

export interface Props {
    label?: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
}

interface State {
    open: boolean;
    autocompleteSuggestions: string[] | null;
}

export default class InputCategory extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            autocompleteSuggestions: null,
            open: false,
        };
    }

    private requestNumber: number = 0;
    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.props.value != prevProps.value)
        {
            if (this.props.value === "") {
                this.setState({ open: false, autocompleteSuggestions: null });
            } else {
                var requestNumber = ++this.requestNumber;
                setTimeout(() => {
                    if (requestNumber == this.requestNumber) {
                        this.refreshSuggestions();
                    }
                }, 300);
            }
        }
    }

    public render() {
        return <div className="field" tabIndex={0}
            onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && this.setState({ open: false, autocompleteSuggestions: null })}
            >
            {this.props.label !== undefined && <label className="label">{this.props.label}</label>}
            <div className={"dropdown is-fullwidth" + (this.state.open && ! this.props.disabled  ? " is-active" : "")}>
                <div className="dropdown-trigger">
                    <input className="input"
                        value={this.props.value}
                        disabled={this.props.disabled}
                        onChange={e => { this.setState({ open: true }); this.props.onChange(e.target.value) }} />
                    {!this.props.disabled && this.props.value !== "" && <button className="button"
                        onClick={() => this.setState({ open: false }, () => this.props.onChange(""))}
                        disabled={this.props.disabled}>
                        <span className="icon is-small">
                            <FontAwesomeIcon icon={faXmark} />
                        </span>
                    </button>}
                </div>
                <div className={"dropdown-menu"} role="menu">
                    <div className="dropdown-content">
                        {this.state.autocompleteSuggestions == null && <div className="dropdown-item">Loading suggestions…</div>}
                        {this.state.autocompleteSuggestions?.map(suggestion => <a
                            className={"dropdown-item"}
                            key={suggestion}
                            onClick={() => this.setState({ open: false }, () => this.props.onChange(suggestion))}>
                            {suggestion}
                        </a>)}
                    </div>
                </div>
            </div>
        </div>;
    }

    private refreshSuggestions()
    {
        if (this.props.value !== "") {
            Api.Taxonomy.categoryAutocomplete(this.props.value).then(result => {
                if (this.state.open) {
                    this.setState({
                        autocompleteSuggestions: result
                    });
                }
            })
        }
    }
}