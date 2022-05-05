namespace homebudget_server.Models.ViewModels
{
    public class ViewSearch
    {
        public ViewSearchGroup? Query { get; set; }
    }

    public class ViewSearchQuery
    {
        public string Column { get; set; }
        public string Value { get; set; }
        public ViewSearchOperator Operator { get; set; }
        public bool Not { get; set; }
    }

    public class ViewSearchGroup
    {
        public ViewSearchGroupType Type { get; set; }
        public List<ViewSearchGroup> Children { get; set; }
        public ViewSearchQuery? Query { get; set; }
    }

    public enum ViewSearchGroupType
    {
        Or,
        And,
        Query,
    }

    public enum ViewSearchOperator
    {
        Equals,
        Contains,
    }
}
