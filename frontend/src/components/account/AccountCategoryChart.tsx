import * as React from "react";
import { Api, useApi } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import {
    Chart as ChartJS,
    LinearScale,
    CategoryScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    BarElement
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
    LinearScale,
    PointElement,
    CategoryScale,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    BarController,
    Legend
);
interface Props {
    id: number
    period: Period
    type?: "bar" | "pie"
}

type DataType = Array<{ category: string, transfer: boolean, revenue: number, expenses: number }>;
interface ChartDataType { category: string, revenue: number, expenses: number, transferRevenue: number, transferExpenses: number };

export default function AccountCategoryChart (props: Props): React.ReactElement {
    const [data, setData] = React.useState<DataType | "fetching">("fetching");
    const api = useApi();

    React.useEffect(() => {
        if (api !== null) {
            void updateData(api, props.id, props.period, setData);
        }
    }, [api, props.id, props.period]);

    if (data === "fetching") {
        return <>Please wait&hellip;</>;
    }

    const mergedData: Map<string, ChartDataType> = new Map();
    for (let i = 0; i < data.length; i++) {
        let value: ChartDataType | undefined = mergedData.get(data[i].category);
        if (value === undefined) {
            value = {
                category: data[i].category,
                revenue: 0,
                transferRevenue: 0,
                expenses: 0,
                transferExpenses: 0
            };
            mergedData.set(data[i].category, value);
        }

        if (data[i].transfer) {
            value.transferRevenue = data[i].revenue;
            value.transferExpenses = data[i].expenses;
        } else {
            value.revenue = data[i].revenue;
            value.expenses = data[i].expenses;
        }
    }
    const sortedData = [...mergedData.values()].sort((a, b) => a.expenses === b.expenses ? (a.revenue - b.revenue) : b.expenses - a.expenses);

    // Generate colors by selecting evenly spaced hues on the color wheel
    // const colors = Array.from(Array(sortedData.length).keys()).map((_, i) => "hsl(" + (i / sortedData.length * 360) + ", 70%, 70%)");
    return <>
        <div style={{ height: "400px", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                <Chart type={"line"} height="400px" data={{
                    labels: sortedData.map(point => point.category),
                    datasets: [{
                        label: "Revenue",
                        data: sortedData.map(point => point.revenue),
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#4db09b"
                    },
                    {
                        label: "Expenses",
                        data: sortedData.map(point => point.expenses > 0 ? -point.expenses : point.expenses),
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#ff6b6b"
                    },
                    {
                        label: "Transfers",
                        data: sortedData.map(point => point.transferRevenue),
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#487eb0"
                    },
                    {
                        label: "Transfers",
                        data: sortedData.map(point => point.transferExpenses > 0 ? -point.transferExpenses : point.transferExpenses),
                        type: "bar",
                        borderColor: "transparent",
                        backgroundColor: "#487eb0"
                    }]
                }} options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    interaction: {
                        intersect: false
                    },
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                filter: (item, data) => item.datasetIndex !== 3
                            },
                            onClick: function (e, legendItem, legend) {
                                const index = legendItem.datasetIndex;
                                if (index === 2 || index === 3) {
                                    const ci = legend.chart;
                                    [
                                        ci.getDatasetMeta(2),
                                        ci.getDatasetMeta(3)
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
    </>;
}

async function updateData (api: Api, id: number, period: Period, setData: React.Dispatch<DataType | "fetching">): Promise<void> {
    const [start, end] = PeriodFunctions.getRange(period);
    const query: SearchGroup = {
        type: SearchGroupType.And,
        children: [{
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

    const result = await api.Account.getCategorySummary(id, query);
    if (result.status === 200) {
        setData(result.data.map(obj => ({
            category: obj.category !== "" ? obj.category : "No category",
            transfer: obj.transfer,
            expenses: obj.expenses.toNumber(),
            revenue: obj.revenue.toNumber()
        })));
    }
}
