namespace assetgrid_backend.Models.ViewModels
{
    public class ViewSearch
    {
        public ViewSearchGroup? Query { get; set; }
        public int From { get; set; }
        public int To { get; set; }
        public string? OrderByColumn { get; set; }
        public bool? Descending { get; set; }
    }

    public class ViewSearchQuery
    {
        public string Column { get; set; } = null!;
        public object? Value { get; set; } = null!;
        public ViewSearchOperator Operator { get; set; }
        public bool Not { get; set; }

        public string OperatorString
        {
            get
            {
                switch (Operator)
                {
                    case ViewSearchOperator.Equals:
                        return Not ? "!=" : "==";
                    case ViewSearchOperator.Contains:
                        return Not ? "does not contain" : "contains";
                    case ViewSearchOperator.In:
                        return Not ? "not in" : "in";
                    case ViewSearchOperator.GreaterThan:
                        return Not ? "<=" : ">";
                    case ViewSearchOperator.GreaterThanOrEqual:
                        return Not ? "<" : ">=";
                    default:
                        throw new Exception("Invalid operator");
                }
            }
        }
    }

    public class ViewSearchGroup
    {
        public ViewSearchGroupType Type { get; set; }
        public List<ViewSearchGroup>? Children { get; set; }
        public ViewSearchQuery? Query { get; set; }

        public override string ToString()
        {
            switch (Type)
            {
                case ViewSearchGroupType.And:
                    return $"AND group with {Children?.Count().ToString() ?? "missing"} children";
                case ViewSearchGroupType.Or:
                    return $"OR group with {Children?.Count().ToString() ?? "missing"} children";
                default:
                    if (Query == null)
                    {
                        throw new Exception();
                    }
                    return $"{Query.Column} {Query.OperatorString} {Query.Value?.ToString() ?? "null"}";
            }
        }
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
        In,
        GreaterThan,
        GreaterThanOrEqual,
    }
}
