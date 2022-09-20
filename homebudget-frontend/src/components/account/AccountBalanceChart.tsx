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
    const [resolution, setResolution] = React.useState<"month" | "day" | "year">("day");

    React.useEffect(() => {
        updateData(props.id, props.period, resolution, setMovements);
    }, [props.period, resolution])

    if (movements === "fetching") {
        return <>Please wait&hellip;</>;
    }

    let balances: number[] = [];
    for (let i = 0; i < movements.items.length; i++) {
        let item = movements.items[i];
        balances[i] = (balances[i - 1] !== undefined ? balances[i - 1] : movements.initialBalance.toNumber()) + item.revenue.toNumber() - item.expenses.toNumber();
    }
    balances = [movements.initialBalance.toNumber(), ...balances];
    balances = [...balances, balances[balances.length - 1]];
    let [start, end] = PeriodFunctions.getRange(props.period);

    return <>
        <div style={{ height: "400px", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
                <Chart type={"line"} height="400px" data={{
                    labels: [start.toJSDate(), ...movements.items.map(point => point.dateTime.toJSDate()), end.toJSDate()],
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
                        data: movements.items.map(point => point.revenue.toNumber()),
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#4db09b"
                    },
                    {
                        label: "Expenses",
                        data: movements.items.map(point => point.expenses.toNumber()),
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
                    let options = ["day", "month", "year"];
                    setResolution(options[options.indexOf(resolution) < options.length - 1 ? options.indexOf(resolution) + 1 : 0] as "month" | "day" | "year");
                }}>{["Daily", "Monthly", "Yearly"][["day", "month", "year"].indexOf(resolution)]}</span>
        </div>
    </>;
}

function updateData(id: number, period: Period, resolutionString: "day" | "year" | "month", setData: React.Dispatch<GetMovementResponse>) {
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
    }

    Api.Account.getMovements(id, start, end, resolution)
        .then(result => {
            setData(result);
        });
}