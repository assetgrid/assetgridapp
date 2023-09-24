using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using assetgrid_backend.Models;

namespace assetgrid_backend.models.MetaFields
{
    public class Attachment
    {
        [MaxLength(250)]
        public required string FileName { get; set; }
        public required long FileSize { get; set; }
        public Guid Id { get; set; }
        public DateTime DateTime { get; set; }
        public virtual int OwnerId { get; set; }
        public required User Owner { get; set; }
    }
}
