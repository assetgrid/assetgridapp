import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { Calendar } from "react-date-range";
import { formatDateTimeWithUser } from "../../lib/Utils";
import InputNumber from "./InputNumber";
import Decimal from "decimal.js";
import DropdownContent from "../common/DropdownContent";
import { useUser } from "../App";

export interface Props {
    label?: string
    value: DateTime
    disabled?: boolean
    onChange: (date: DateTime) => void
    fullwidth: boolean
    errors?: string[]
}

export default function InputDateTime (props: Props): React.ReactElement {
    const [open, setOpen] = React.useState(false);
    const user = useUser();
    const isError = props.errors !== undefined && props.errors.length > 0;
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    let value: string;
    if (props.value == null) {
        value = "Select date";
    } else {
        value = formatDateTimeWithUser(props.value, user);
    }

    const disabled = props.disabled === true;
    return <div className="field input-datetime">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className={"dropdown" + (props.fullwidth ? " is-fullwidth" : "") + (open && disabled ? " is-active" : "") + (isError ? " is-danger" : "")} onBlur={onBlur}>
            <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" onClick={e => setOpen(true) } disabled={props.disabled}>
                    <span>{value}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={faAngleDown} />
                    </span>
                </button>
            </div>
            <DropdownContent active={open} fullWidth={false}>
                <div ref={dropdownRef} className={"dropdown-menu"} role="menu" tabIndex={0} style={{ maxWidth: "none" }}>
                    <div className="input-datetime dropdown-content">
                        <Calendar
                            date={props.value.startOf("day").toJSDate()}
                            onChange={date => props.onChange(DateTime.fromObject({
                                year: date.getFullYear(),
                                month: date.getMonth() + 1,
                                day: date.getDate(),
                                hour: props.value.hour,
                                minute: props.value.minute,
                                second: props.value.second,
                                millisecond: props.value.millisecond
                            })) }
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

    function onBlur (e: React.FocusEvent): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !(dropdownRef.current?.contains(e.relatedTarget as Node) ?? false)) {
            setOpen(false);
        }
    }
}
