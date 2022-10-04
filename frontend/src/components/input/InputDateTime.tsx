import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { Calendar } from "react-date-range";
import { formatDateTimeWithUser, formatDateWithUser } from "../../lib/Utils";
import { userContext } from "../App";
import InputNumber from "./InputNumber";
import Decimal from "decimal.js";
import DropdownContent from "../common/DropdownContent";

export interface Props {
    label?: string,
    value: DateTime,
    disabled?: boolean,
    onChange: (date: DateTime) => void;
    fullwidth: boolean;
    errors?: string[];
}

export default function InputDateTime (props: Props) {
    const [open, setOpen] = React.useState(false);
    const { user } = React.useContext(userContext);
    const isError = props.errors !== undefined && props.errors.length > 0;
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    var value: string;
    if (props.value == null) {
        value = "Select date";
    } else {
        value = formatDateTimeWithUser(props.value, user);
    }
    
    return <div className="field input-datetime">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className={"dropdown" + (props.fullwidth ? " is-fullwidth" : "") + (open && !props.disabled ? " is-active" : "") + (isError ? " is-danger" : "")} onBlur={onBlur}>
            <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" onClick={e => setOpen(true) } disabled={props.disabled}>
                    <span>{value}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faAngleDown} />
                    </span>
                </button>
            </div>
            <DropdownContent active={open}>
                <div ref={dropdownRef} className={"dropdown-menu"} role="menu" tabIndex={0} style={{maxWidth: "none"}}>
                    <div className="input-datetime dropdown-content">
                        <Calendar
                            date={props.value.startOf("day").toJSDate()}
                            onChange={date => props.onChange(DateTime.fromJSDate(date))}
                        />
                        <div className="input-time">
                            <InputNumber
                                allowNull={false}
                                value={new Decimal(props.value.hour)}
                                disabled={props.disabled}
                                onChange={value => props.onChange(props.value.set({ hour: value.toNumber() }))} />
                            <div className="separator"> : </div>
                            <InputNumber
                                allowNull={false}
                                value={new Decimal(props.value.minute)}
                                disabled={props.disabled}
                                onChange={value => props.onChange(props.value.set({ minute: value.toNumber() }))} />
                        </div>
                    </div>
                </div>
            </DropdownContent>
        </div>
        {isError && <p className="help has-text-danger">
            {props.errors![0]}
        </p>}
    </div>;

    function onBlur(e: React.FocusEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !dropdownRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
        }
    }
}