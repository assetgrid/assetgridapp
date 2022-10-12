using assetgrid_backend.models;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.ViewModels
{
    public class ViewCsvImportProfile
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters")]
        public string Name { get; set; } = null!;
        public CsvImportProfile Profile { get; set; } = null!;
    }
}
