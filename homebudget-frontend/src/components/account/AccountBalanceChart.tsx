import * as React from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, CartesianGrid, Tooltip, YAxis, Legend, AreaChart, Area, BarChart, Bar, ComposedChart } from "recharts";
import { GetMovementResponse, TimeResolution } from "../../models/account";
import ResizeObserver from 'react-resize-detector';
import { Api } from "../../lib/ApiClient";
import { DateTime, Duration, DurationLike } from "luxon";
import { Preferences } from "../../models/preferences";
import { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Period, PeriodFunctions } from "../../models/period";

interface Props {
    id: number;
    preferences: Preferences | "fetching";
    period: Period;
}

interface State {
    data: GetMovementResponse | "fetching";
    type: "cashflow" | "balance";
    resolution: "month" | "day" | "year";
}

export default class AccountBalanceChart extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            data: "fetching",
            type: "balance",
            resolution: "day",
        };
    }


    
    public render() {
        if (this.state.data === "fetching") {
            return <>Please wait&hellip;</>;
        }

        let data: { datetime: number, balance: number, revenue: number, expenses: number }[] = [];
        for (let i = 0; i < this.state.data.items.length; i++) {
            let item = this.state.data.items[i];
            data[i] = {
                datetime: item.dateTime.valueOf(),
                balance: (data[i - 1] !== undefined ? data[i - 1].balance : this.state.data.initialBalance.toNumber()) + item.revenue.toNumber() - item.expenses.toNumber(),
                revenue: item.revenue.toNumber(),
                expenses: item.expenses.toNumber(),
            };
        }
        let [start, end] = PeriodFunctions.getRange(this.props.period);

        return <>
            <div style={{ height: 400 }}>
                <ResponsiveContainer>
                    {this.state.type === "balance"
                        ? <ComposedChart data={data}>
                            <defs>
                                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#558eb3" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#558eb3" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="step" dataKey={"balance"} strokeWidth={2} stroke={"rgb(6, 30, 47)"} fill="url(#fill)" animateNewValues={false} />
                            <Line dataKey="revenue" stroke="none" fill="none" />
                            <Line dataKey="expenses" stroke="none" fill="none" />
                            <XAxis dataKey={'datetime'}
                                domain={data.length != 0 ? [start?.valueOf() ?? DateTime.now().minus({ years: 1 }).valueOf(), end?.valueOf() ?? DateTime.now().valueOf()] : undefined}
                                scale="time"
                                type="number"
                                tickFormatter={(date: number) => DateTime.fromMillis(date).toFormat("dd LLL yy")} />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip content={(data: any) => this.customTooltip(data, this.state.type, this.props.preferences)} />
                            <Legend />
                        </ComposedChart>
                        : <ComposedChart data={data}>
                            <XAxis dataKey={'datetime'}
                                domain={data.length != 0 ? [start?.valueOf() ?? DateTime.now().minus({ years: 1 }).valueOf(), end?.valueOf() ?? DateTime.now().valueOf()] : undefined}
                                scale="time"
                                type="number"
                                padding={{ left: 30, right: 30 }}
                                tickFormatter={(date: number) => DateTime.fromMillis(date).toFormat("dd LLL yy")} />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip content={(data: any) => this.customTooltip(data, this.state.type, this.props.preferences)} />
                            <Legend />
                            <Line dataKey="balance" stroke="none" />
                            <Line type="monotone" dataKey="revenue" stroke="#4db09b" strokeWidth={2} animateNewValues={false} />
                            <Line type="monotone" dataKey="expenses" stroke="#ff6b6b" strokeWidth={2} animateNewValues={false} />
                        </ComposedChart >}
                </ResponsiveContainer>
            </div>
            <div className="tags" style={{ alignItems: "baseline" }}>
                <p>Showing (click to change):</p>&nbsp;
                <span style={{ cursor: "pointer" }} className="tag is-dark"
                    onClick={() => {
                        let options = ["day", "month", "year"];
                        this.setState({ resolution: options[options.indexOf(this.state.resolution) < options.length - 1 ? options.indexOf(this.state.resolution) + 1 : 0] as "month" | "day" | "year" }, () => 
                            this.updateData())
                    }}>{["Daily", "Monthly", "Yearly"][["day", "month", "year"].indexOf(this.state.resolution)]}</span>
                <span style={{ cursor: "pointer" }} className="tag is-dark"
                    onClick={() => this.setState({ type: this.state.type === "balance" ? "cashflow" : "balance" })}>
                    { this.state.type === "balance" ? <>Balance</> : <>Revenue/expenses</>}
                </span>
            </div>
        </>;
    }

    componentDidMount(): void {
        this.updateData();
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
        if (prevProps.period !== this.props.period) {
            this.updateData();
        }
    }

    private updateData() {
        let resolution: TimeResolution;
        let [start, end] = PeriodFunctions.getRange(this.props.period);
        switch (this.state.resolution) {
            case "day":
                resolution = TimeResolution.Daily;
                break;
            case "month":
                resolution = TimeResolution.Monthly;
                break;
            case "year":
                resolution = TimeResolution.Yearly;
                break;
        }

        Api.Account.getMovements(this.props.id, start, end, resolution)
            .then(result => {
                this.setState({ data: result });
            });
    }

    private customTooltip(data: { active: boolean, payload: any, label: number }, type: "cashflow" | "balance", preferences: Preferences | "fetching") {
        let { active, payload, label } = data;
        if (active && payload && payload.length) {
            return (
                <div style={{ background: "white", padding: "0.75rem", border: "1px solid #999" }}>
                    <p className="label">{DateTime.fromMillis(label).toLocaleString(DateTime.DATE_FULL)}</p>
                    {type === "balance" && <p className="desc">Balance: {formatNumberWithPrefs(new Decimal(payload[0].value), preferences)}</p>}
                    {type === "cashflow" && <>
                        <p className="desc">Revenue: {formatNumberWithPrefs(new Decimal(payload[1].value), preferences)}</p>
                        <p className="desc">Expenses: {formatNumberWithPrefs(new Decimal(payload[2].value), preferences)}</p>
                    </>}
                </div>
            );
        }
      
        return null;
    }
}