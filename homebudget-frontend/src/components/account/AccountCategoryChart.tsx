import * as React from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, CartesianGrid, Tooltip, YAxis, Legend, AreaChart, Area, BarChart, Bar, ComposedChart, PieChart, Pie, Cell } from "recharts";
import { GetMovementResponse, TimeResolution } from "../../models/account";
import ResizeObserver from 'react-resize-detector';
import { Api } from "../../lib/ApiClient";
import { DateTime, Duration, DurationLike } from "luxon";
import { Preferences } from "../../models/preferences";
import { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Period, PeriodFunctions } from "../../models/period";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";

interface Props {
    id: number;
    preferences: Preferences | "fetching";
    period: Period;
    type?: "bar" | "pie";
}

interface State {
    data: { category: string, revenue: Decimal, expenses: Decimal }[] | "fetching";
}

export default class AccountCategoryChart extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            data: "fetching",
        };
    }

    public render() {
        if (this.state.data === "fetching") {
            return <>Please wait&hellip;</>;
        }

        let data: { category: string, revenue: number, expenses: number }[] = [];
        let keys = Object.keys(this.state.data);
        for (let i = 0; i < keys.length; i++) {
            let item = this.state.data[i];
            data[i] = {
                category: item.category === "" ? "No category" : item.category,
                revenue: item.revenue.toNumber(),
                expenses: item.expenses.toNumber(),
            };
        }

        // Generate colors by selecting evenly spaced hues on the color wheel
        let colors = Array.from(Array(data.length).keys()).map((_, i) => "hsl(" + (i / data.length * 360) + ", 70%, 70%)");
        console.log(colors);

        return <>
            <div style={{ height: 400 }}>
                <ResponsiveContainer>
                    {(this.props.type ?? "bar") === "bar"
                        ? < BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={'category'} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" fill="#4db09b" />
                            <Bar dataKey="expenses" fill="#ff6b6b" />
                        </BarChart>
                        : <PieChart>
                            <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius="30%" outerRadius="50%">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Pie data={data} dataKey="expenses" nameKey="category" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" legendType="none">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>}
                </ResponsiveContainer>
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
        let [start, end] = PeriodFunctions.getRange(this.props.period);
        let query: SearchGroup = {
            type: SearchGroupType.And,
            children: [ {
                type: SearchGroupType.Query,
                query: {
                    column: "DateTime",
                    value: start.toISO(),
                    operator: SearchOperator.GreaterThanOrEqual,
                    not: false
                }
            }, {
                type: SearchGroupType.Query,
                query: {
                    column: "DateTime",
                    value: end.toISO(),
                    operator: SearchOperator.GreaterThan,
                    not: true
                }
            }]
        };

        Api.Account.getCategorySummary(this.props.id, query)
            .then(result => {
                this.setState({ data: result });
            });
    }
}