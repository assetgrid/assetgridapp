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

type DataType = { category: string, revenue: number, expenses: number }[];

export default function AccountCategoryChart(props: Props) {
    let [data, setData] = React.useState<DataType | "fetching">("fetching");

    React.useEffect(() => {
        updateData(props.id, props.period, setData);
    }, [props.id, props.period]);

    if (data === "fetching") {
        return <>Please wait&hellip;</>;
    }

    // Generate colors by selecting evenly spaced hues on the color wheel
    let colors = Array.from(Array(data.length).keys()).map((_, i) => "hsl(" + (i / data.length * 360) + ", 70%, 70%)");
    return <>
        <div style={{ height: 400 }}>
            <ResponsiveContainer>
                {(props.type ?? "bar") === "bar"
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

function updateData(id: number, period: Period, setData: React.Dispatch<DataType | "fetching">) {
    let [start, end] = PeriodFunctions.getRange(period);
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

    Api.Account.getCategorySummary(id, query)
        .then(result => {
            setData(result.map(obj => ({
                category: obj.category !== "" ? obj.category : "No category",
                expenses: obj.expenses.toNumber(),
                revenue: obj.revenue.toNumber()
            })));
        });
}