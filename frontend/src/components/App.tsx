import * as React from "react";
import { Route, Routes, useNavigate } from "react-router";
import { routes } from "../lib/routes";
import PageTransactions from "./pages/transaction/PageTransactions";
import PageCreateTransaction from "./pages/transaction/PageCreateTransaction";
import PageDashboard from "./pages/PageDashboard";
import PageImportTransactionsCsv from "./pages/transaction/PageImportTransactionsCsv";
import PageAccount from "./pages/account/PageAccount";
import PagePreferences from "./pages/PagePreferences";
import PageAccountOverview from "./pages/account/PageAccountOverview";
import * as Api from "../lib/ApiClient";
import Sidebar from "./common/Sidebar";
import PageTransaction from "./pages/transaction/PageTransaction";
import PageEditMultipleTransactions from "./pages/transaction/PageEditMultipleTransactions";
import PageAccountConfirmDelete from "./pages/account/PageAccountConfirmDelete";
import Page404 from "./pages/Page404";
import PageCreateAccount from "./pages/account/PageCreateAccount";
import MobileHeader from "./common/MobileHeader";
import { User } from "../models/user";
import PageLogin from "./pages/PageLogin";
import PageSignup from "./pages/PageSignup";
import PageProfile from "./pages/PageProfile";
import PageAutomation from "./pages/automation/PageAutomation";
import PageAutomationTransactionCreate from "./pages/automation/transaction/PageAutomationTransactionCreate";
import PageAutomationTransactionModify from "./pages/automation/transaction/PageAutomationTransactionModify";
import PageMeta from "./pages/PageMeta";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 60
        }
    }
});

export default function AssetgridApp (): React.ReactElement {
    const [showSidebar, setShowSidebar] = React.useState(false);

    return <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path={routes.login()} element={<PageLogin />} />
                <Route path={routes.signup()} element={<PageSignup />} />
                <Route path='*' element={<>
                    <div className="mobile-header-spacing"></div>
                    <MobileHeader setShowSidebar={setShowSidebar} sidebarVisible={showSidebar} />
                    <div style={{ display: "flex", flexGrow: 1 }}>
                        <Sidebar show={showSidebar} setShowSidebar={setShowSidebar}></Sidebar>
                        <div className={"main-content" + (showSidebar ? " sidebar-shown" : "")} style={{ flexGrow: 1, backgroundColor: "#EEE", maxWidth: "100%" }}>
                            <Routes>
                                <Route path={routes.dashboard()} element={<PageDashboard />} />
                                <Route path={routes.importCsv()} element={<PageImportTransactionsCsv />} />

                                <Route path={routes.transaction(":id")} element={<PageTransaction />}/>
                                <Route path={routes.transactions()} element={<PageTransactions />}/>
                                <Route path={routes.transactionEditMultiple()} element={<PageEditMultipleTransactions />}/>
                                <Route path={routes.transactionCreate()} element={<PageCreateTransaction />} />

                                <Route path={routes.accounts()} element={<PageAccountOverview />} />
                                <Route path={routes.account(":id")} element={<PageAccount />} />
                                <Route path={routes.accountDelete(":id")} element={<PageAccountConfirmDelete />} />
                                <Route path={routes.accountCreate()} element={<PageCreateAccount />} />

                                <Route path={routes.automation()} element={<PageAutomation />} />
                                <Route path={routes.automationTransactionCreate()} element={<PageAutomationTransactionCreate />} />
                                <Route path={routes.automationTransactionEdit(":id")} element={<PageAutomationTransactionModify />} />

                                <Route path={routes.meta()} element={<PageMeta />} />

                                <Route path={routes.preferences()} element={<PagePreferences />} />
                                <Route path={routes.profile()} element={<PageProfile />} />

                                <Route path='*' element={<Page404 />} />
                            </Routes>
                        </div>
                    </div>
                </>} />
            </Routes>
        </QueryClientProvider>
    </React.StrictMode>;
}

export function useUser (): User | undefined {
    const navigate = useNavigate();
    const { data } = useQuery({
        queryKey: ["user"],
        queryFn: Api.getUser,
        keepPreviousData: true,
        retry: 0,
        onError: () => {
            localStorage.removeItem("token");
            navigate(routes.login());
        }
    });
    return data;
}
