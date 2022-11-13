using assetgrid_backend.models.Search;

namespace assetgrid_backend.Models.ViewModels
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
        public required List<T> Data { get; set; }
        public int TotalItems { get; set; }
    }
}
