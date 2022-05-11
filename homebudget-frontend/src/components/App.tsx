import * as React from "react";
import { Route, Switch  } from "react-router";
import { routes } from "../lib/routes";
import PageTransactions from "./transaction/PageTransactions";
import SiteHeader from "./SiteHeader";
import PageCreateTransaction from "./transaction/PageCreateTransaction";
import PageDashboard from "./pages/PageDashboard";
import PageImportCsv from "./import/PageImportCsv";
import PageAccount from "./account/PageAccount";
import { Sidebar } from "./common/Sidebar";

export default class FairFitPortalApp extends React.Component {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <>
            <SiteHeader />
            <div style={{display: "flex", flexGrow: 1}}>
                <Sidebar />
                <div style={{ flexGrow: 1, backgroundColor: "#EEE" }}>
                    <Switch>
                        <Route exact path={routes.dashboard()} component={PageDashboard} />
                        <Route exact path={routes.importCsv()} component={PageImportCsv} />
                        <Route exact path={routes.transactions()} component={PageTransactions}/>
                        <Route exact path={routes.createTransaction()} component={PageCreateTransaction}/>
                        <Route exact path={routes.account(":id")} component={PageAccount}/>
                    </Switch>
                </div>
            </div>
        </>;
    }
}
