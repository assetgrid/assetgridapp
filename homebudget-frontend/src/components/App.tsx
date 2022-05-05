import * as React from "react";
import { Route, Switch  } from "react-router";
import { routes } from "../lib/routes";
import PageTransactions from "./transaction/PageTransactions";
import SiteHeader from "./SiteHeader";
import PageCreateTransaction from "./transaction/PageCreateTransaction";
import PageDashboard from "./pages/PageDashboard";

export default class FairFitPortalApp extends React.Component {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <>
            <SiteHeader />
            <Switch>
                <Route exact path={routes.dashboard()} component={PageDashboard} />
                <Route exact path={routes.transactions()} component={PageTransactions}/>
                <Route exact path={routes.createTransaction()} component={PageCreateTransaction}/>
            </Switch>
        </>;
    }
}
