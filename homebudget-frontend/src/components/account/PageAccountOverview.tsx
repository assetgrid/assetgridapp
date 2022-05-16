import * as React from "react";
import { Card } from "../common/Card";
import AccountList from "./AccountList";

export default class PageAccountOverview extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }
    public render(): React.ReactNode {
        return <>
            <section className="hero has-background-primary">
                <div className="hero-body">
                    <p className="title has-text-white">Accounts</p>
                    <p className="subtitle has-text-white">Manage your accounts</p>
                </div>
            </section>
            <div className="p-3">
                <Card title="Accounts">
                    <AccountList />
                </Card>
            </div>
        </>;
    }
}