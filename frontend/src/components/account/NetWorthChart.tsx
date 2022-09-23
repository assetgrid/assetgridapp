import * as React from "react";
import { Account, GetMovementAllResponse, GetMovementResponse, TimeResolution } from "../../models/account";
import { Api } from "../../lib/ApiClient";
import { DateTime, Duration, DurationLike } from "luxon";
import { Preferences } from "../../models/preferences";
import Utils, { formatDateWithPrefs, formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Period, PeriodFunctions } from "../../models/period";
import 'chartjs-adapter-luxon';
import {
    Chart as ChartJS,
    LinearScale,
    TimeScale,
    PointElement,
    LineController,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarElement,
    BarController,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { preferencesContext } from "../App";
import Card from "../common/Card";
import AccountLink from "./AccountLink";
  
ChartJS.register(
    LinearScale,
    PointElement,
    TimeScale,
    LineController,
    LineElement,
    BarController,
    BarElement,
    Title,
    Tooltip,
    Legend
)

interface Props {
    period: Period;
    showTable: boolean;
}

export default function (props: Props) {
    const [movements, setMovements] = React.useState<GetMovementAllResponse | "fetching">("fetching");
    const [resolution, setResolution] = React.useState<"month" | "day" | "week" | "year">("day");
    const [perAccount, setPerAccount] = React.useState(true);
    const [displayingPeriod, setDisplayingPeriod] = React.useState(props.period);

    const colors = ["#7eb0d5", "#fd7f6f", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"];

    React.useEffect(() => {
        updateData(props.period, setDisplayingPeriod, resolution, setMovements);
    }, [props.period, resolution])

    if (movements === "fetching") {
        return <div className="columns m-0 is-multiline">
            {props.showTable && <div className="column p-0 is-flex is-narrow-tablet">
                <Card isNarrow={true} title="Net worth">
                    Please wait&hellip;
                </Card>
            </div>}
            <div className="column p-0 is-flex is-12-tablet is-reset-desktop">
                <Card title="Development in net worth" isNarrow={false} style={{ flexGrow: 1 }}>
                    Please wait&hellip;
                </Card>
            </div>
        </div>;
    }

    let [start, end] = PeriodFunctions.getRange(displayingPeriod);
    let timepoints = Object.keys(movements.items).flatMap(key => movements.items[Number(key)].items.map(item => item.dateTime));
    if (timepoints.length === 0 || timepoints[0].diff(start, "days").days > 1) {
        timepoints = [start, ...timepoints];
    }
    if (end.diff(timepoints[timepoints.length - 1], "days").days > 1) {
        timepoints.push(end);
    }

    let revenue: { [accountId: number]: number[] } = {}; 
    let totalRevenue: number[] = [];
    let expenses: { [accountId: number]: number[] } = {};
    let totalExpenses: number[] = [];
    let balances: { [accountId: number]: number[] } = {};
    let totalBalance: number[] = [];

    Object.keys(movements.items).forEach(key => {
        const accountId = Number(key);
        const accountData = movements.items[accountId];
        let itemIndex = 0;
        revenue[accountId] = [];
        expenses[accountId] = [];
        balances[accountId] = [accountData.initialBalance.toNumber()];

        timepoints.forEach((timepoint, timepointIndex) => {
            if (accountData.items.length === itemIndex || accountData.items[itemIndex].dateTime.toISODate() !== timepoint.toISODate()) {
                // The account has no more timepoints or the current timepoint on the account doesn't match
                revenue[accountId][timepointIndex] = 0;
                expenses[accountId][timepointIndex] = 0;
            } else {
                revenue[accountId][timepointIndex] = accountData.items[itemIndex].revenue.toNumber();
                expenses[accountId][timepointIndex] = accountData.items[itemIndex].expenses.toNumber();
                itemIndex += 1;
            }

            if (timepointIndex > 0) {
                balances[accountId][timepointIndex] = balances[accountId][timepointIndex - 1];
            }
            balances[accountId][timepointIndex] += revenue[accountId][timepointIndex] - expenses[accountId][timepointIndex];

            totalRevenue[timepointIndex] = (totalRevenue[timepointIndex] ?? 0) + revenue[accountId][timepointIndex];
            totalExpenses[timepointIndex] = (totalExpenses[timepointIndex] ?? 0) + expenses[accountId][timepointIndex];
            totalBalance[timepointIndex] = (totalBalance[timepointIndex] ?? 0) + balances[accountId][timepointIndex];
        });
    });

    return <div className="columns m-0 is-multiline">
        {props.showTable && <div className="column p-0 is-flex is-narrow-tablet">
            <NetWorthTable period={displayingPeriod}
                accountBalances={movements.accounts.map(account => ({
                    account,
                    balance: balances[account.id][balances[account.id].length - 1],
                    expenses: expenses[account.id].reduce((sum, current) => sum + current, 0),
                    revenue: revenue[account.id].reduce((sum, current) => sum + current, 0),
                }))}
            />
        </div>}
        <div className="column p-0 is-flex is-12-tablet is-reset-desktop">
            <Card title="Development in net worth" isNarrow={false} style={{ flexGrow: 1 }}>
                <div style={{ height: "400px", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
                        <Chart type={"line"} height="400px" data={{
                            labels: timepoints,
                            datasets: perAccount
                                ? Object.keys(movements.items).map(Number).flatMap((accountId, index) => [{
                                    label: movements.accounts.find(account => account.id == accountId)?.name,
                                    data: balances[accountId],
                                    type: "line",
                                    stepped: true,
                                    borderColor: colors[index & colors.length],
                                    backgroundColor: "transparent",
                                }])
                                : [{
                                    label: "Net worth",
                                    data: totalBalance,
                                    type: "line",
                                    stepped: true,
                                    borderColor: "#558eb3",
                                    backgroundColor: "transparent",
                                },
                                {
                                    label: "Revenue",
                                    data: totalRevenue,
                                    type: "bar",
                                    borderColor: "transparent",
                                    backgroundColor: "#4db09b"
                                },
                                {
                                    label: "Expenses",
                                    data: totalExpenses,
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
                                    },
                                    min: start.valueOf(),
                                    max: end.valueOf()
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
                    <span style={{ cursor: "pointer" }} className="tag is-dark"
                        onClick={() => setPerAccount(value => !value)}>{perAccount ? "Per account" : "All accounts"}</span>
                </div>
            </Card>
        </div>
    </div>;
}

function updateData(period: Period, setDisplayingPeriod: (period: Period) => void,
    resolutionString: "day" | "week" | "year" | "month", setData: React.Dispatch<GetMovementAllResponse>) {
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

    Api.Account.getMovementsAll(start, end, resolution)
        .then(result => {
            setDisplayingPeriod(period);
            setData(result);
        });
}

interface NetWorthTableProps {
    period: Period,
    accountBalances: { account: Account, balance: number, revenue: number, expenses: number }[];
}
function NetWorthTable(props: NetWorthTableProps) {
    const { preferences } = React.useContext(preferencesContext);
    return <Card isNarrow={true} title="Net worth">
        <table className="table">
            <thead>
                <tr>
                    <th>Account</th>
                    <th>Balance</th>
                    <th>Change since <br /> {formatDateWithPrefs(props.period.start, preferences)}</th>
                </tr>
            </thead>
            <tbody>
                {props.accountBalances.map(obj => <tr key={obj.account.id}>
                    <td><AccountLink account={obj.account} /></td>
                    <td>{formatNumberWithPrefs(new Decimal(obj.balance), preferences)}</td>
                    <td>{formatNumberWithPrefs(new Decimal(obj.revenue - obj.expenses), preferences)}</td>
                </tr>)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Net worth</th>
                    <th>{formatNumberWithPrefs(new Decimal(props.accountBalances.reduce((sum, item) => item.balance + sum, 0)), preferences)}</th>
                    <th>{formatNumberWithPrefs(new Decimal(props.accountBalances.reduce((sum, item) => item.revenue - item.expenses + sum, 0)), preferences)}</th>
                </tr>
            </tfoot>
        </table>
    </Card>;
}