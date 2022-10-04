import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { Period, PeriodFunctions } from "../../models/period";
import * as solid from "@fortawesome/free-solid-svg-icons"
import { Calendar, DateRange, DateRangePicker, defaultInputRanges, defaultStaticRanges, Range, RangeKeyDict } from "react-date-range";
import { DateTime } from "luxon";
import DropdownContent from "./DropdownContent";

interface Props {
    period: Period;
    onChange: (period: Period) => void;
}

interface State {
    down: boolean;
}

export default function PeriodSelector(props: Props) {
    const [open, setOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    return <div className="field has-addons period-selector" style={{ position: "relative" }} onBlur={onBlur}>
        <p className="control">
            <button className="button" onClick={() => props.onChange(PeriodFunctions.decrement(props.period))}>
                <span className="icon is-small">
                    <FontAwesomeIcon icon={solid.faArrowLeft} />
                </span>
            </button>
        </p>
        <p className="control date-display">
            <button className="button" onClick={() => setOpen(open => ! open)}>
                <span className="icon is-small">
                    <FontAwesomeIcon icon={solid.faCalendarAlt} />
                </span>
                <span className="text">{PeriodFunctions.print(props.period)}</span>
                <span className="icon is-small">
                    <FontAwesomeIcon icon={open ? solid.faAngleUp : solid.faAngleDown} />
                </span>
            </button>
        </p>
        <p className="control">
            <button className="button" onClick={() => props.onChange(PeriodFunctions.increment(props.period))}>
                <span className="icon is-small">
                    <FontAwesomeIcon icon={solid.faArrowRight} />
                </span>
            </button>
        </p>
        <DropdownContent active={open} fullWidth={false}>
            {renderDropdown()}
        </DropdownContent>
    </div>;

    function renderDropdown() {
        return <div className="period-dropdown" ref={dropdownRef} tabIndex={0}>
            <ul className="period-sidebar">
                <li onClick={() => props.onChange({ type: "custom", start: DateTime.now().startOf("day"), end: DateTime.now().endOf("day") })}>
                    Today
                </li>
                <li
                    className={props.period.type === "month" ? "active" : ""}
                    onClick={() => props.onChange({ type: "month", start: props.period.start.startOf("month") })}>
                    Month
                </li>
                <li
                    className={props.period.type === "year" ? "active" : ""}
                    onClick={() => props.onChange({ type: "year", start: props.period.start.startOf("year") })}>
                    Year
                </li>
                <li className={props.period.type === "custom" ? "active" : ""}
                    onClick={() => props.onChange({
                        type: "custom",
                        start: props.period.start,
                        end: props.period.type === "custom" ? props.period.end : props.period.start.plus({ days: 7 })
                    })}>
                    Custom Period
                </li>
            </ul>
            {["month", "year"].indexOf(props.period.type) != -1 && <div className="details">
                <p>
                    Dispay one {props.period.type} starting on <i>{props.period.start.toLocaleString(DateTime.DATE_MED)}</i>.
                </p>
                <div className="calendar-wrapper">
                    <Calendar
                        scroll={{ enabled: true }}
                        minDate={DateTime.now().minus({ years: 20 }).toJSDate()}
                        maxDate={DateTime.now().plus({ years: 1 }).toJSDate()}
                        date={props.period.start.toJSDate()}
                        onChange={date => props.onChange({ ...props.period, start: DateTime.fromJSDate(date).startOf("day") })}
                    />
                </div>
            </div>}
            {props.period.type === "custom" && <div className="details">
                <p>
                    Select the period to display.
                </p>
                <div className="calendar-wrapper">
                    <DateRange
                        scroll={{ enabled: true }}
                        editableDateInputs={true}
                        minDate={DateTime.now().minus({ years: 20 }).toJSDate()}
                        maxDate={DateTime.now().plus({ years: 1 }).toJSDate()}
                        ranges={[{ startDate: props.period.start.startOf("day").toJSDate(), endDate: props.period.end.endOf("day").toJSDate(), key: "range" }]}
                        onChange={item => props.onChange({
                            type: "custom",
                            start: DateTime.fromJSDate((item.range as Range).startDate!).startOf("day"),
                            end: DateTime.fromJSDate((item.range as Range).endDate!).endOf("day"),
                        })}
                    />
                </div>
            </div>}
        </div>;
    }

    function onBlur(e: React.FocusEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !dropdownRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
        }
    }
}