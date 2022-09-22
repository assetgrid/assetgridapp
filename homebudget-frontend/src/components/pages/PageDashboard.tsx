import { DateTime } from "luxon";
import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Period } from "../../models/period";
import { Preferences } from "../../models/preferences";
import AccountList from "../account/AccountList";
import CreateAccountModal from "../account/input/CreateAccountModal";
import NetWorthChart from "../account/NetWorthChart";
import Card from "../common/Card";
import Hero from "../common/Hero";
import PeriodSelector from "../common/PeriodSelector";
import TransactionList from "../transaction/TransactionList";

export default function PageDashboard() {
    const [period, setPeriod] = React.useState<Period>({
        type: "month",
        start: DateTime.now().startOf("month"),
    });

    return <>
        <Hero title="Dashboard" subtitle="Overview of your finances" period={[period, setPeriod]} />
        <div className="p-3">
            <NetWorthChart period={period} showTable={true} />
        </div>
    </>;
}
