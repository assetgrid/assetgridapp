import * as React from "react";
import { GetMovementResponse, TimeResolution } from "../../models/account";
import { useApi } from "../../lib/ApiClient";
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
    BarController,
    LegendElement,
    ChartTypeRegistry
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

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

const TimeResolutionValues = ["month", "day", "week", "year"] as const;

export default function AccountBalanceChart (props: Props): React.ReactElement {
    const [resolution, setResolution] = React.useState<typeof TimeResolutionValues[number]>("day");
    const { t } = useTranslation();
    const api = useApi();
    const { data, isSuccess } = useQuery({
        queryKey: ["account", props.id, "transactions", "movements", resolution, PeriodFunctions.serialize(props.period)],
        queryFn: updateData,
        keepPreviousData: true
    });
    const movements = data?.movements;
    const displayingPeriod = data?.period ?? props.period;

    if (movements === undefined) {
        return <>{t("common.please_wait")}</>;
    }
    if (!isSuccess) {
        return <>{t("common.error_occured")}</>;
    }

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
                        label: t("account.balance")!,
                        data: balances,
                        type: "line",
                        stepped: true,
                        borderColor: "#558eb3",
                        backgroundColor: "transparent"
                    },
                    {
                        label: t("account.revenue")!,
                        data: revenues,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#4db09b",
                        stack: "revenue"
                    },
                    {
                        label: t("account.expenses")!,
                        data: expenses,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#ff6b6b",
                        stack: "expenses"
                    },
                    {
                        label: t("account.transfers")!,
                        data: transferRevenues,
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#487eb0",
                        stack: "revenue"
                    },
                    {
                        label: t("account.transfers")!,
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
                                    ChartJS.defaults.plugins.legend.onClick.bind(this as LegendElement<keyof ChartTypeRegistry>)(e, legendItem, legend);
                                }
                            }
                        }
                    }
                }}>
                </Chart>
            </div>
        </div>
        <div className="tags" style={{ alignItems: "baseline" }}>
            <p>{t("chart.aggregate_by")}</p>&nbsp;
            {TimeResolutionValues.map(option =>
                <span key={option} style={{ cursor: option === resolution ? "auto" : "pointer" }}
                    className={option === resolution ? "tag is-primary" : "tag is-dark"}
                    onClick={() => setResolution(option)}>
                    {[
                        t("common.day"),
                        t("common.week"),
                        t("common.month"),
                        t("common.year")][TimeResolutionValues.indexOf(option)]}
                </span>)}
        </div>
    </>;

    async function updateData (): Promise<{ movements: GetMovementResponse, period: Period }> {
        let resolutionValue: TimeResolution;
        const [start, end] = PeriodFunctions.getRange(props.period);
        switch (resolution) {
            case "day":
                resolutionValue = TimeResolution.Daily;
                break;
            case "month":
                resolutionValue = TimeResolution.Monthly;
                break;
            case "year":
                resolutionValue = TimeResolution.Yearly;
                break;
            case "week":
                resolutionValue = TimeResolution.Weekly;
                break;
        }

        const result = await api.Account.getMovements(props.id, start, end, resolutionValue);
        return { movements: result, period: props.period };
    }
}
