import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { Calendar } from "react-date-range";
import { formatDateTimeWithPrefs, formatDateWithPrefs } from "../../lib/Utils";
import { preferencesContext } from "../App";
import InputNumber from "./InputNumber";
import Decimal from "decimal.js";

export interface Props {
    label?: string,
    value: DateTime,
    disabled?: boolean,
    onChange: (date: DateTime) => void;
    fullwidth: boolean;
}

export default function InputDateTime (props: Props) {
    const [open, setOpen] = React.useState(false);
    const { preferences } = React.useContext(preferencesContext);

    var value: string;
    if (props.value == null) {
        value = "Select date";
    } else {
        value = formatDateTimeWithPrefs(props.value, preferences);
    }
    
    return <div className="field input-datetime" tabIndex={0}
        onBlur={e => ! e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
        >
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className={"dropdown" + (props.fullwidth ? " is-fullwidth" : "") + (open && ! props.disabled ? " is-active" : "")}>
            <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" onClick={e => setOpen(true) } disabled={props.disabled}>
                    <span>{value}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faAngleDown} />
                    </span>
                </button>
            </div>
            <div className={"dropdown-menu"} role="menu" style={{maxWidth: "none"}}>
                <div className="dropdown-content">
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
        </div>
    </div>;
}