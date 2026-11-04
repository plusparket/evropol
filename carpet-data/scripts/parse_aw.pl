#!/usr/bin/perl
# raw/associated-weavers/_api-*.json + first-colour pages -> associated-weavers.json
# Colour lists come from the site's search API; specs, description and full-size photos from the product pages.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;

my $R=root(); my $B='https://associated-weavers.com';
my %seen; my @products;
for my $f (glob("$R/raw/associated-weavers/_api-list-*.json")) {
    for my $p (@{read_json($f)->{products}}) { push @products,$p unless $seen{"$p->{themeCode}/$p->{catalogType}"}++ }
}
my %theme; my @out;
for my $p (@products) {
    next if $theme{$p->{themeCode}}++;      # same range in several catalogues: first wins
    my @cols;
    my %info;
    for my $c (@{$p->{colors}}) {
        (my $path=$c->{url}) =~ s/\?.*//;
        (my $slug=$path) =~ s{.*/}{};
        my $f="$R/raw/associated-weavers/$slug.html";
        my %col=(code=>$c->{colorCode}, name=>$c->{colorName}, productCode=>$c->{productCode}, url=>$B.$path,
            image=>abs_url($B,$c->{packshotSource}), roomImage=>abs_url($B,$c->{roomshotSource}), widths=>$c->{widths});
        if (-s $f) {
            my $h=slurp($f);
            $info{$slug}=$h;
            # 280 px macro shot and full-size room shot of this very colour, when the page was downloaded.
            if ($h =~ m{<img src="([^"]+)" class="w-100 h-100 product-detail__media"}) { $col{image}=abs_url($B,$1) }
            if ($h =~ m{class="carousel-item active"[^>]*>\s*<img src="([^"]+)"}) { $col{roomImage}=abs_url($B,$1) }
        }
        push @cols,\%col;
    }
    my ($h)=values %info;
    my (@specs,$desc,$pdf,@images,%si);
    if ($h) {
        if ($h =~ m{<table class="product-datasheet__table">(.*?)</table>}s) {
            my $t=$1;
            while ($t =~ m{<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>}sg) {
                my ($l,$v)=(clean(strip($1)),clean(strip($2)));
                push @specs,{label=>$l,value=>$v} if defined $v && length $v;
            }
        }
        ($desc)= $h =~ m{<meta name="description" content="([^"]*)"}; $desc=clean($desc);
        ($pdf) = $h =~ m{(?:href|data-[a-z-]*(?:url|href|file|link)[a-z-]*)="([^"#]+\.pdf[^"]*)"}i;
    }
    for my $c (@cols) { my $u=$c->{roomImage}; push @images,$u if $u && !$si{$u}++ }
    for (qw(textureText backing heightText)) { }
    push @out,{brand=>'Associated Weavers', collection=>$p->{name}, themeCode=>$p->{themeCode}, catalogType=>$p->{catalogType},
        url=>$cols[0]{url}, description=>$desc, specs=>\@specs, datasheetPdf=>($pdf?abs_url($B,$pdf):undef), images=>\@images, colours=>\@cols};
}
@out = sort { $a->{collection} cmp $b->{collection} } @out;
write_json("$R/associated-weavers.json",\@out);
my $n=0; $n+=@{$_->{colours}} for @out;
my $ns=grep { !@{$_->{specs}} } @out;
printf "aw: %d collections, %d colours, %d without specs\n",scalar(@out),$n,$ns;
