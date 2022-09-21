import * as React from "react";
import { GetMovementResponse, TimeResolution } from "../../models/account";
import { Api } from "../../lib/ApiClient";
import { DateTime, Duration, DurationLike } from "luxon";
import { Preferences } from "../../models/preferences";
import Utils, { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Period, PeriodFunctions } from "../../models/period";
import 'chartjs-adapter-luxon';
import {
    Chart as ChartJS,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarElement
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
  
ChartJS.register(
    LinearScale,
    PointElement,
    TimeScale,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
)

interface Props {
    id: number;
    preferences: Preferences | "fetching";
    period: Period;
}

export default function AccountBalanceChart(props: Props) {
    const [movements, setMovements] = React.useState<GetMovementResponse | "fetching">("fetching");
    const [resolution, setResolution] = React.useState<"month" | "day" | "week" | "year">("day");

    React.useEffect(() => {
        updateData(props.id, props.period, resolution, setMovements);
    }, [props.period, resolution])

    if (movements === "fetching") {
        return <>Please wait&hellip;</>;
    }

    let balances: number[] = [];
    let revenues: number[] = movements.items.map(point => point.revenue.toNumber());
    let expenses: number[] = movements.items.map(point => point.expenses.toNumber());
    let labels = movements.items.map(point => point.dateTime.toJSDate());
    for (let i = 0; i < movements.items.length; i++) {
        let item = movements.items[i];
        balances[i] = (balances[i - 1] !== undefined ? balances[i - 1] : movements.initialBalance.toNumber()) + item.revenue.toNumber() - item.expenses.toNumber();
    }
    let [start, end] = PeriodFunctions.getRange(props.period);

    if (movements.items.length === 0 || movements.items[0].dateTime.diff(start, "days").days > 1) {
        balances = [movements.initialBalance.toNumber(), ...balances];
        revenues = [0, ...revenues];
        expenses = [0, ...expenses];
        labels = [start.toJSDate(), ...labels];
    }
    if (movements.items.length < 2 || movements.items[movements.items.length - 1].dateTime.diff(end, "days").days < - 1) {
        balances = [...balances, balances[balances.length - 1]];
        revenues = [...revenues, 0];
        expenses = [...expenses, 0];
        labels = [...labels, end.toJSDate()];
    }

    return <>
        <div style={{ height: "400px", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
                <Chart type={"line"} height="400px" data={{
                    labels,
                    datasets: [{
                        label: "Balance",
                        data: balances,
                        type: "line",
                        stepped: true,
                        borderColor: "#558eb3",
                        backgroundColor: "transparent",
                    },
                    {
                        label: "Revenue",
                        data: revenues,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#4db09b"
                    },
                    {
                        label: "Expenses",
                        data: expenses,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#ff6b6b"
                    }],
                }} options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    scales: {
                        x: {
                            type: 'time',
                            display: true,
                            offset: true,
                            time: {
                                unit: resolution
                            }
                        },
                    },
                    interaction: {
                        intersect: false,
                    }
                    }}>
                </Chart>
            </div>
        </div>
        <div className="tags" style={{ alignItems: "baseline" }}>
            <p>Showing (click to change):</p>&nbsp;
            <span style={{ cursor: "pointer" }} className="tag is-dark"
                onClick={() => {
                    let options = ["day", "week", "month", "year"];
                    setResolution(options[options.indexOf(resolution) < options.length - 1 ? options.indexOf(resolution) + 1 : 0] as "month" | "day" | "year");
                }}>{["Daily", "Weekly", "Monthly", "Yearly"][["day", "week", "month", "year"].indexOf(resolution)]}</span>
        </div>
    </>;
}

function updateData(id: number, period: Period, resolutionString: "day" | "week" | "year" | "month", setData: React.Dispatch<GetMovementResponse>) {
    let resolution: TimeResolution;
    let [start, end] = PeriodFunctions.getRange(period);
    switch (resolutionString) {
        case "day":
            resolution = TimeResolution.Daily;
            break;
        case "month":
            resolution = TimeResolution.Monthly;
            break;
        case "year":
            resolution = TimeResolution.Yearly;
            break;
        case "week":
            resolution = TimeResolution.Weekly;
            break;
    }

    Api.Account.getMovements(id, start, end, resolution)
        .then(result => {
            setData(result);
        });
}