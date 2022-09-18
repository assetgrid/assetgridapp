import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { Preferences } from "../../models/preferences";
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
    BarElement
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
  
ChartJS.register(
    LinearScale,
    PointElement,
    CategoryScale,
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
        <div>
            <Chart type={"line"} height="400px" data={{
                labels: data.map(point => point.category),
                datasets: [{
                    label: "Revenue",
                    data: data.map(point => point.revenue),
                    type: "bar",
                    borderColor: "transparent",
                    backgroundColor: "#4db09b"
                },
                {
                    label: "Expenses",
                    data: data.map(point => point.expenses),
                    type: "bar",
                    borderColor: "transparent",
                    backgroundColor: "#ff6b6b"
                }],
            }} options={{
                maintainAspectRatio: false,
                responsive: true,
                interaction: {
                    intersect: false,
                }
            }}>
            </Chart>
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