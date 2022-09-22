import * as React from "react";
import Card from "../common/Card";
import Hero from "../common/Hero";
import Image404 from "../../assets/404.svg";

export default function () {
    return <>
        <Hero title="Page not found" subtitle="The page you requested could not be found" isDanger={true} />
        <div className="p-3">
            <Card title="Not found" isNarrow={true}>
                <p>You have requested a page that does not exist. It may have been moved or deleted, or you may have mistyped the address.</p>

                <div style={{ textAlign: "center" }}>
                    <img src={Image404} style={{ maxWidth: "400px", display: "inline-block" }} />
                    <div>
                        <a href="https://www.freepik.com/free-vector/oops-404-error-with-broken-robot-concept-illustration_13315300.htm#query=404&position=2&from_view=keyword">Image by storyset</a> on Freepik
                    </div>
                </div>
            </Card>
        </div>
    </>;
}