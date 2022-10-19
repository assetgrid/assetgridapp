import * as React from "react";
import { GetMovementResponse, TimeResolution } from "../../models/account";
import { Api, useApi } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";
import "chartjs-adapter-luxon";
import {
    Chart as ChartJS,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    LineController,
    Tooltip,
    Legend,
    BarElement,
    BarController
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
    LinearScale,
    PointElement,
    TimeScale,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend
);

interface Props {
    id: number
    period: Period
}

export default function AccountBalanceChart (props: Props): React.ReactElement {
    const [movements, setMovements] = React.useState<GetMovementResponse | "fetching">("fetching");
    const [resolution, setResolution] = React.useState<"month" | "day" | "week" | "year">("day");
    const [displayingPeriod, setDisplayingPeriod] = React.useState(props.period);
    const api = useApi();

    React.useEffect(() => {
        if (api !== null) {
            void updateData(api, props.id, props.period, setDisplayingPeriod, resolution, setMovements);
        }
    }, [api, props.period, resolution]);

    if (movements === "fetching") {
        return <>Please wait&hellip;</>;
    }
    console.log(movements);

    let balances: number[] = [];
    let revenues: number[] = movements.items.map(point => point.revenue.toNumber());
    let expenses: number[] = movements.items.map(point => point.expenses.toNumber());
    let transferRevenues: number[] = movements.items.map(point => point.transferRevenue.toNumber());
    let transferExpenses: number[] = movements.items.map(point => point.transferExpenses.toNumber());
    let labels = movements.items.map(point => point.dateTime.toJSDate());
    for (let i = 0; i < movements.items.length; i++) {
        const item = movements.items[i];
        balances[i] = (balances[i - 1] !== undefined ? balances[i - 1] : movements.initialBalance.toNumber()) +
            item.revenue.toNumber() - item.expenses.toNumber() + item.transferRevenue.toNumber() - item.transferExpenses.toNumber();
    }
    const [start, end] = PeriodFunctions.getRange(displayingPeriod);

    if (movements.items.length === 0 || movements.items[0].dateTime.diff(start, "days").days > 1) {
        balances = [movements.initialBalance.toNumber(), ...balances];
        revenues = [0, ...revenues];
        expenses = [0, ...expenses];
        transferRevenues = [0, ...transferRevenues];
        transferExpenses = [0, ...transferExpenses];
        labels = [start.toJSDate(), ...labels];
    }
    if (movements.items.length < 2 || movements.items[movements.items.length - 1].dateTime.diff(end, "days").days < -1) {
        balances = [...balances, balances[balances.length - 1]];
        revenues = [...revenues, 0];
        transferRevenues = [...transferRevenues, 0];
        expenses = [...expenses, 0];
        transferExpenses = [...transferExpenses, 0];
        labels = [...labels, end.toJSDate()];
    }

    return <>
        <div style={{ height: "400px", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                <Chart type={"line"} height="400px" data={{
                    labels,
                    datasets: [{
                        label: "Balance",
                        data: balances,
                        type: "line",
                        stepped: true,
                        borderColor: "#558eb3",
                        backgroundColor: "transparent"
                    },
                    {
                        label: "Revenue",
                        data: revenues,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#4db09b",
                        stack: "revenue"
                    },
                    {
                        label: "Expenses",
                        data: expenses,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#ff6b6b",
                        stack: "expenses"
                    },
                    {
                        label: "Transfers",
                        data: transferRevenues,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#487eb0",
                        stack: "revenue"
                    },
                    {
                        label: "Transfers",
                        data: transferExpenses,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#487eb0",
                        stack: "expenses"
                    }]
                }} options={{
                    normalized: true,
                    maintainAspectRatio: false,
                    responsive: true,
                    scales: {
                        x: {
                            type: "time",
                            display: true,
                            offset: true,
                            time: {
                                unit: resolution
                            },
                            min: start.valueOf(),
                            max: end.valueOf()
                        }
                    },
                    interaction: {
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            labels: {
                                filter: (item, data) => item.datasetIndex !== 4
                            },
                            onClick: function (e, legendItem, legend) {
                                const index = legendItem.datasetIndex;
                                if (index === 3 || index === 4) {
                                    const ci = legend.chart;
                                    [
                                        ci.getDatasetMeta(3),
                                        ci.getDatasetMeta(4)
                                    ].forEach(function (meta) {
                                        meta.hidden = (meta.hidden === null ? ci.data.datasets[index].hidden !== true : null) as boolean;
                                    });
                                    ci.update();
                                } else {
                                    ChartJS.defaults.plugins.legend.onClick.bind(this as any)(e, legendItem, legend);
                                }
                            }
                        }
                    }
                }}>
                </Chart>
            </div>
        </div>
        <div className="tags" style={{ alignItems: "baseline" }}>
            <p>Aggregate by:</p>&nbsp;
            {["day", "week", "month", "year"].map(option =>
                <span key={option} style={{ cursor: option === resolution ? "auto" : "pointer" }}
                    className={option === resolution ? "tag is-primary" : "tag is-dark"}
                    onClick={() => setResolution(option as any)}>
                    {["Day", "Week", "Month", "Year"][["day", "week", "month", "year"].indexOf(option as any)]}
                </span>)}
        </div>
    </>;
}

async function updateData (api: Api, id: number, period: Period, setDisplayingPeriod: (period: Period) => void,
    resolutionString: "day" | "week" | "year" | "month", setData: React.Dispatch<GetMovementResponse>): Promise<void> {
    let resolution: TimeResolution;
    const [start, end] = PeriodFunctions.getRange(period);
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

    const result = await api.Account.getMovements(id, start, end, resolution);
    if (result.status === 200) {
        setDisplayingPeriod(period);
        setData(result.data);
    }
}
