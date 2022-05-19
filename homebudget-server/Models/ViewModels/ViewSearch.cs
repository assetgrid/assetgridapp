namespace homebudget_server.Models.ViewModels
{
    public class ViewSearch
    {
        public ViewSearchGroup? Query { get; set; }
        public int From { get; set; }
        public int To { get; set; }
    }

    public class ViewSearchQuery
    {
        public string Column { get; set; } = null!;
        public object Value { get; set; } = null!;
        public ViewSearchOperator Operator { get; set; }
        public bool Not { get; set; }
    }

    public class ViewSearchGroup
    {
        public ViewSearchGroupType Type { get; set; }
        public List<ViewSearchGroup>? Children { get; set; }
        public ViewSearchQuery? Query { get; set; }
    }

    public class ViewSearchResponse<T>
    {
        public List<T> Data { get; set; } = null!;
        public int TotalItems { get; set; }
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
        GreaterThan,
        GreaterThanOrEqual,
    }
}
