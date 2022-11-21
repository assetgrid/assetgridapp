import * as React from "react";
import { Account, GetMovementAllResponse, TimeResolution } from "../../models/account";
import { Api, useApi } from "../../lib/ApiClient";
import { formatDateWithUser, formatNumberWithUser } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Period, PeriodFunctions } from "../../models/period";
import "chartjs-adapter-luxon";
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
    BarController
} from "chart.js";
import { Chart } from "react-chartjs-2";
import Card from "../common/Card";
import AccountLink from "./AccountLink";
import { useTranslation } from "react-i18next";
import { useUser } from "../App";

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
);

interface Props {
    period: Period
    showTable: boolean
}

export default function NetWorthChart (props: Props): React.ReactElement {
    const [movements, setMovements] = React.useState<GetMovementAllResponse | "fetching">("fetching");
    const [resolution, setResolution] = React.useState<"month" | "day" | "week" | "year">("day");
    const [perAccount, setPerAccount] = React.useState(true);
    const [displayingPeriod, setDisplayingPeriod] = React.useState(props.period);

    const colors = ["#7eb0d5", "#fd7f6f", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"];
    const api = useApi();
    const { t } = useTranslation();

    React.useEffect(() => {
        if (api !== null) {
            void updateData(api, props.period, setDisplayingPeriod, resolution, setMovements);
        }
    }, [api, props.period, resolution]);

    if (movements === "fetching") {
        return <div className="columns m-0 is-multiline">
            {props.showTable && <div className="column p-0 is-flex is-narrow-tablet">
                <Card isNarrow={true} title={t("common.net_worth")!}>
                    {t("common.please_wait")}
                </Card>
            </div>}
            <div className="column p-0 is-flex is-12-tablet is-reset-desktop">
                <Card title={t("chart.development_in_net_worth")!} isNarrow={false} style={{ flexGrow: 1 }}>
                    {t("common.please_wait")}
                </Card>
            </div>
        </div>;
    }

    const [start, end] = PeriodFunctions.getRange(displayingPeriod);
    let timepoints = Object.keys(movements.items)
        .flatMap(key => movements.items[Number(key)].items.map(item => item.dateTime))
        .sort((a, b) => a.diff(b).valueOf());
    if (timepoints.length === 0 || timepoints[0].diff(start, "days").days > 1) {
        timepoints = [start, ...timepoints];
    }
    if (end.diff(timepoints[timepoints.length - 1], "days").days > 1) {
        timepoints.push(end);
    }

    const revenue: { [accountId: number]: number[] } = {};
    const transferRevenue: { [accountId: number]: number[] } = {};
    const totalRevenue: number[] = [];
    const expenses: { [accountId: number]: number[] } = {};
    const transferExpenses: { [accountId: number]: number[] } = {};
    const totalExpenses: number[] = [];
    const balances: { [accountId: number]: number[] } = {};
    const totalBalance: number[] = [];

    Object.keys(movements.items).forEach(key => {
        const accountId = Number(key);
        const accountData = movements.items[accountId];
        let itemIndex = 0;
        revenue[accountId] = [];
        transferRevenue[accountId] = [];
        expenses[accountId] = [];
        transferExpenses[accountId] = [];
        balances[accountId] = [accountData.initialBalance.toNumber()];

        timepoints.forEach((timepoint, timepointIndex) => {
            if (accountData.items.length === itemIndex || accountData.items[itemIndex].dateTime.toISODate() !== timepoint.toISODate()) {
                // The account has no more timepoints or the current timepoint on the account doesn't match
                revenue[accountId][timepointIndex] = 0;
                transferRevenue[accountId][timepointIndex] = 0;
                expenses[accountId][timepointIndex] = 0;
                transferExpenses[accountId][timepointIndex] = 0;
            } else {
                revenue[accountId][timepointIndex] = accountData.items[itemIndex].revenue.toNumber();
                transferRevenue[accountId][timepointIndex] = accountData.items[itemIndex].transferRevenue.toNumber();
                expenses[accountId][timepointIndex] = accountData.items[itemIndex].expenses.toNumber();
                transferExpenses[accountId][timepointIndex] = accountData.items[itemIndex].transferExpenses.toNumber();
                itemIndex += 1;
            }

            if (timepointIndex > 0) {
                balances[accountId][timepointIndex] = balances[accountId][timepointIndex - 1];
            }
            balances[accountId][timepointIndex] += revenue[accountId][timepointIndex] - expenses[accountId][timepointIndex] +
                transferRevenue[accountId][timepointIndex] - transferExpenses[accountId][timepointIndex];

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
                    revenue: revenue[account.id].reduce((sum, current) => sum + current, 0)
                }))}
            />
        </div>}
        <div className="column p-0 is-flex is-12-tablet is-reset-desktop">
            <Card title={t("chart.development_in_net_worth")!} isNarrow={false} style={{ flexGrow: 1 }}>
                <div style={{ height: "400px", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                        <Chart type={"line"} height="400px" data={{
                            labels: timepoints,
                            datasets: perAccount
                                ? Object.keys(movements.items).map(Number).flatMap((accountId, index) => [{
                                    label: movements.accounts.find(account => account.id === accountId)?.name,
                                    data: balances[accountId],
                                    type: "line",
                                    stepped: true,
                                    borderColor: colors[index % colors.length],
                                    backgroundColor: "transparent"
                                }])
                                : [{
                                    label: t("common.net_worth")!,
                                    data: totalBalance,
                                    type: "line",
                                    stepped: true,
                                    borderColor: "#558eb3",
                                    backgroundColor: "transparent"
                                },
                                {
                                    label: t("account.revenue")!,
                                    data: totalRevenue,
                                    type: "bar",
                                    borderColor: "transparent",
                                    backgroundColor: "#4db09b"
                                },
                                {
                                    label: t("account.expenses")!,
                                    data: totalExpenses,
                                    type: "bar",
                                    borderColor: "transparent",
                                    backgroundColor: "#ff6b6b"
                                }]
                        }} options={{
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
                            }
                        }}>
                        </Chart>
                    </div>
                </div>
                <div className="tags" style={{ alignItems: "baseline" }}>
                    <p>{t("chart.aggregate_by")}</p>&nbsp;
                    <span style={{ cursor: "pointer" }} className="tag is-dark"
                        onClick={() => {
                            const options = ["day", "week", "month", "year"];
                            setResolution(options[options.indexOf(resolution) < options.length - 1 ? options.indexOf(resolution) + 1 : 0] as "month" | "day" | "year");
                        }}>{[
                            t("common.day"),
                            t("common.week"),
                            t("common.month"),
                            t("common.year")][["day", "week", "month", "year"].indexOf(resolution)]}</span>
                    <span style={{ cursor: "pointer" }} className="tag is-dark"
                        onClick={() => setPerAccount(value => !value)}>{perAccount ? t("chart.aggregate.per_account") : t("chart.aggregate.all_accounts")}</span>
                </div>
            </Card>
        </div>
    </div>;
}

async function updateData (api: Api, period: Period, setDisplayingPeriod: (period: Period) => void,
    resolutionString: "day" | "week" | "year" | "month", setData: React.Dispatch<GetMovementAllResponse>): Promise<void> {
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

    const result = await api.Account.getMovementsAll(start, end, resolution);
    setDisplayingPeriod(period);
    if (result.status === 200) {
        setData(result.data);
    }
}

interface NetWorthTableProps {
    period: Period
    accountBalances: Array<{ account: Account, balance: number, revenue: number, expenses: number }>
}
function NetWorthTable (props: NetWorthTableProps): React.ReactElement {
    const user = useUser();
    const { t } = useTranslation();

    return <Card isNarrow={true} title={t("chart.net_worth")!}>
        <table className="table">
            <thead>
                <tr>
                    <th>{t("common.account")}</th>
                    <th>{t("account.balance")}</th>
                    <th>{t("chart.change_since")}<br />{formatDateWithUser(props.period.start, user)}</th>
                </tr>
            </thead>
            <tbody>
                {props.accountBalances.map(obj => <tr key={obj.account.id}>
                    <td><AccountLink account={obj.account} /></td>
                    <td>{formatNumberWithUser(new Decimal(obj.balance), user)}</td>
                    <td>{formatNumberWithUser(new Decimal(obj.revenue - obj.expenses), user)}</td>
                </tr>)}
            </tbody>
            <tfoot>
                <tr>
                    <th>{t("common.net_worth")}</th>
                    <th>{formatNumberWithUser(new Decimal(props.accountBalances.reduce((sum, item) => item.balance + sum, 0)), user)}</th>
                    <th>{formatNumberWithUser(new Decimal(props.accountBalances.reduce((sum, item) => item.revenue - item.expenses + sum, 0)), user)}</th>
                </tr>
            </tfoot>
        </table>
    </Card>;
}
