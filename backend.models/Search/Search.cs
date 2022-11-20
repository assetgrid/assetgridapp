using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace assetgrid_backend.models.Search
{
    public class SearchQuery
    {
        public int Version => 1;
        public required string Column { get; set; }
        public object? Value { get; set; }
        public SearchOperator Operator { get; set; }
        public bool Not { get; set; }
        public bool MetaData { get; set; }

        public string OperatorString
        {
            get
            {
                switch (Operator)
                {
                    case SearchOperator.Equals:
                        return Not ? "!=" : "==";
                    case SearchOperator.Contains:
                        return Not ? "does not contain" : "contains";
                    case SearchOperator.In:
                        return Not ? "not in" : "in";
                    case SearchOperator.GreaterThan:
                        return Not ? "<=" : ">";
                    case SearchOperator.GreaterThanOrEqual:
                        return Not ? "<" : ">=";
                    case SearchOperator.IsNull:
                        return Not ? "is null" : "is not null";
                    default:
                        throw new Exception("Invalid operator");
                }
            }
        }
    }

    public class SearchGroup
    {
        public int Version => 1;
        public SearchGroupType Type { get; set; }
        public List<SearchGroup>? Children { get; set; }
        public SearchQuery? Query { get; set; }

        public override string ToString()
        {
            switch (Type)
            {
                case SearchGroupType.And:
                    return $"AND group with {Children?.Count().ToString() ?? "missing"} children";
                case SearchGroupType.Or:
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

    public enum SearchGroupType
    {
        Or,
        And,
        Query,
    }

    public enum SearchOperator
    {
        Equals,
        Contains,
        In,
        GreaterThan,
        GreaterThanOrEqual,
        IsNull
    }
}
