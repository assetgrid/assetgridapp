import * as React from "react";
import Card from "../common/Card";
import Hero from "../common/Hero";

export default function () {
    return <>
        <Hero title="Error" subtitle="An error occured" isDanger={true} />
        <div className="p-3">
            <Card title="Error" isNarrow={true}>
                <p>An unknown error occured.</p>
                <p>If you believe that this is a bug you can report it on our <a href="https://github.com/Assetgrid/assetgridapp/issues/new?assignees=alex6480&labels=bug&template=bug_report.md&title=" target="_blank">Github page</a></p>
            </Card>
        </div>
    </>;
}