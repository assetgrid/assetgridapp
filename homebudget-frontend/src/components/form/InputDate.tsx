import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { Calendar } from "react-date-range";

export interface Props {
    label?: string,
    value: DateTime,
    disabled?: boolean,
    onChange: (date: DateTime) => void;
}

interface State {
    open: boolean
}

export default class InputAccount extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            open: false,
        };
    }

    public render() {
        var value: string;
        if (this.props.value == null) {
            value = "Select date";
        } else {
            value = this.props.value.toString()
        }
        
        return <div className="field" tabIndex={0}
            onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && this.setState({ open: false })}
            >
            {this.props.label !== undefined && <label className="label">{this.props.label}</label>}
            <div className={"dropdown is-fullwidth" + (this.state.open && ! this.props.disabled ? " is-active" : "")}>
                <div className="dropdown-trigger">
                    <button className="button" aria-haspopup="true" onClick={e => this.setState({ open: true }) } disabled={this.props.disabled}>
                        <span>{value}</span>
                        <span className="icon is-small">
                            <FontAwesomeIcon icon={faAngleDown} />
                        </span>
                    </button>
                </div>
                <div className={"dropdown-menu"} role="menu">
                    <div className="dropdown-content">
                        <Calendar
                            date={this.props.value.startOf("day").toJSDate()}
                            onChange={date => this.props.onChange(DateTime.fromJSDate(date))}
                        />
                    </div>
                </div>
            </div>
        </div>;
    }
}