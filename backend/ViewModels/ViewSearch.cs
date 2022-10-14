using assetgrid_backend.models.Search;

namespace assetgrid_backend.ViewModels
{
    public class ViewSearch
    {
        public SearchGroup? Query { get; set; }
        public int From { get; set; }
        public int To { get; set; }
        public string? OrderByColumn { get; set; }
        public bool? Descending { get; set; }
    }

    public class ViewSearchResponse<T>
    {
        public List<T> Data { get; set; } = null!;
        public int TotalItems { get; set; }
    }
}
