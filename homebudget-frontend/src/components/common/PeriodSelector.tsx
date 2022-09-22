import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { Period, PeriodFunctions } from "../../models/period";
import * as solid from "@fortawesome/free-solid-svg-icons"
import { Calendar, DateRange, DateRangePicker, defaultInputRanges, defaultStaticRanges, Range, RangeKeyDict } from "react-date-range";
import { DateTime } from "luxon";

interface Props {
    period: Period;
    onChange: (period: Period) => void;
}

interface State {
    down: boolean;
}

export default class PeriodSelector extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            down: false
        };
    }

    public render() {
        return <div className="field has-addons period-selector" style={{ position: "relative" }}>
            <p className="control">
                <button className="button" onClick={() => this.props.onChange(PeriodFunctions.decrement(this.props.period))}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={solid.faArrowLeft} />
                    </span>
                </button>
            </p>
            <p className="control date-display">
                <button className="button" onClick={() => this.state.down ? this.up() : this.down()}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={solid.faCalendarAlt} />
                    </span>
                    <span className="text">{PeriodFunctions.print(this.props.period)}</span>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={this.state.down ? solid.faAngleUp : solid.faAngleDown} />
                    </span>
                </button>
            </p>
            <p className="control">
                <button className="button" onClick={() => this.props.onChange(PeriodFunctions.increment(this.props.period))}>
                    <span className="icon is-small">
                        <FontAwesomeIcon icon={solid.faArrowRight} />
                    </span>
                </button>
            </p>
            {this.state.down && this.renderDropdown()}
        </div>;
    }
 

    private down() {
        this.setState({ down: true }, () => {
            window.addEventListener("click", this.up);
        });
    }

    private up = ((e?: MouseEvent) => {
        let target: HTMLElement | null = e?.target as HTMLElement;
        while (target) {
            if (target.classList.contains("period-selector")) {
                return;
            }
            target = target.parentElement;
        }

        this.setState({ down: false });
        window.removeEventListener("click", this.up);
    }).bind(this);

    private renderDropdown() {
        return <div className="dropdown">
            <ul className="sidebar">
                <li onClick={() => this.props.onChange({ type: "custom", start: DateTime.now().startOf("day"), end: DateTime.now().endOf("day") })}>
                    Today
                </li>
                <li
                    className={this.props.period.type === "month" ? "active" : ""}
                    onClick={() => this.props.onChange({ type: "month", start: this.props.period.start.startOf("month") })}>
                    Month
                </li>
                <li
                    className={this.props.period.type === "year" ? "active" : ""}
                    onClick={() => this.props.onChange({ type: "year", start: this.props.period.start.startOf("year") })}>
                    Year
                </li>
                <li className={this.props.period.type === "custom" ? "active" : ""}
                    onClick={() => this.props.onChange({
                        type: "custom",
                        start: this.props.period.start,
                        end: this.props.period.type === "custom" ? this.props.period.end : this.props.period.start.plus({ days: 7 })
                    })}>
                    Custom Period
                </li>
            </ul>
            {["month", "year"].indexOf(this.props.period.type) != -1 && <div className="details">
                <p>
                    Dispay one {this.props.period.type} starting on <i>{this.props.period.start.toLocaleString(DateTime.DATE_MED)}</i>.
                </p>
                <div className="calendar-wrapper">
                    <Calendar
                        scroll={{ enabled: true }}
                        minDate={DateTime.now().minus({ years: 20 }).toJSDate()}
                        maxDate={DateTime.now().plus({ years: 1 }).toJSDate()}
                        date={this.props.period.start.toJSDate()}
                        onChange={date => this.props.onChange({ ...this.props.period, start: DateTime.fromJSDate(date).startOf("day") })}
                    />
                </div>
            </div>}
            {this.props.period.type === "custom" && <div className="details">
                <p>
                    Select the period to display.
                </p>
                <div className="calendar-wrapper">
                    <DateRange
                        scroll={{ enabled: true }}
                        editableDateInputs={true}
                        minDate={DateTime.now().minus({ years: 20 }).toJSDate()}
                        maxDate={DateTime.now().plus({ years: 1 }).toJSDate()}
                        ranges={[{ startDate: this.props.period.start.startOf("day").toJSDate(), endDate: this.props.period.end.endOf("day").toJSDate(), key: "range" }]}
                        onChange={item => this.props.onChange({
                            type: "custom",
                            start: DateTime.fromJSDate((item.range as Range).startDate!).startOf("day"),
                            end: DateTime.fromJSDate((item.range as Range).endDate!).endOf("day"),
                        })}
                    />
                </div>
            </div>}
        </div>;
    }
}