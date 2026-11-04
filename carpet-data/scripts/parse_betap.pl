#!/usr/bin/perl
# raw/betap/<slug>.html -> betap.json. Skips carpet tiles and artificial grass.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;

my $R = root();
my $all = read_json("$R/raw/betap/_api-search-all.json");
my $res = read_json("$R/raw/betap/_api-search-residential.json");
my %resid = map { $_->{id} => 1 } @{$res->{products}};
my (@out, @skipped);

for my $p (sort { $a->{title} cmp $b->{title} } @{$all->{products}}) {
    (my $slug = $p->{slug}) =~ s{.*/}{};
    my $file = "$R/raw/betap/$slug.html";
    unless (-s $file) { push @skipped, "$p->{title}: no page"; next }
    my $h = slurp($file);
    my ($main) = $h =~ m{<main[^>]*>(.*?)</main>}s or do { push @skipped, "$p->{title}: no main"; next };

    my ($desc) = $main =~ m{class="product-intro">.*?</h1>(.*?)</div>}s;
    my %seen; my @specs; my %col;
    while ($main =~ m{class="single-spec row">(.*?)(?=class="single-spec row"|class="product-images"|</section>|\z)}sg) {
        my $b = $1;
        while ($b =~ m{<div data-color="(\d+)" class="color-specs">\s*<div class="col-6">\s*<p><b>(.*?)</b></p>\s*</div>\s*<div class="col-6">\s*(.*?)\s*</div>}sg) {
            my ($id,$l,$v)=($1,clean(strip($2)),clean(strip($3)));
            $col{$id}{$l}=$v;
        }
        (my $b2 = $b) =~ s{<div data-color="\d+" class="color-specs">.*?</div>\s*</div>\s*</div>}{}sg;
        if ($b2 =~ m{<p><b>(.*?)</b></p>\s*</div>\s*<div class="col-6">\s*(.*?)\s*</div>}s) {
            my ($l,$v)=(clean(strip($1)),clean(strip($2)));
            next if !defined $v || $v eq '' || $seen{$l}++;
            push @specs, {label=>$l, value=>$v};
        }
    }
    my ($type) = map { $_->{value} } grep { $_->{label} eq 'Type of product' } @specs;
    if ($p->{title} =~ /\bTile\b/i) { push @skipped, "$p->{title}: tile"; next }
    if (($type // '') =~ /grass/i)  { push @skipped, "$p->{title}: artificial grass"; next }

    my ($pdf) = $main =~ m{href="(https://betap\.com/assets/uploads/[^"]+\.pdf)"};
    my %imgs; my @images;
    if ($h =~ m{class="product-header"\s+style="background-image:\s*url\('([^']+)'\)}s) { push @images, $1; $imgs{$1}=1 }
    my %name; my %big;
    while ($main =~ m{<a href="([^"]+)" data-lightbox="color-(\d+)"><img src="[^"]+" alt="([^"]*)"}g) {
        $big{$2} //= $1; $name{$2} //= clean($3);
    }
    my @colours;
    while ($main =~ m{<button data-color="(\d+)" class="color color-btn" style="background-image: url\('([^']+)'\)}g) {
        my ($id,$th)=($1,$2);
        next if grep { $_->{id} eq $id } @colours;
        push @colours, {id=>$id, code=>$col{$id}{'Color number'}, name=>$name{$id}, image=>$big{$id}//$th, thumbnail=>$th,
            url=>"https://betap.com/products/$slug?color=$id"};
    }
    # Other per-colour specs, when a product has them.
    for my $c (@colours) {
        my %o = %{$col{$c->{id}}||{}}; delete $o{'Color number'};
        $c->{specs} = [map { {label=>$_, value=>$o{$_}} } sort keys %o] if %o;
        delete $c->{id};
    }
    # Room shots and any further photo that is not a colour swatch.
    my %cimg = map { ($_->{image}=>1, $_->{thumbnail}=>1) } @colours;
    while ($main =~ m{(https://betap\.com/assets/uploads/(?:Producten|Projecten)/[^"'\s)]+\.(?:jpe?g|png|webp))}gi) {
        my $u=$1; next if $imgs{$u}++ || $cimg{$u} || $u =~ m{/_thumbnail/};
        push @images,$u;
    }
    push @out, {brand=>'Betap', collection=>$p->{title}, url=>$p->{slug}, residentialSegment=>($resid{$p->{id}}?JSON::PP::true:JSON::PP::false),
        description=>strip($desc), specs=>\@specs, datasheetPdf=>$pdf, images=>\@images, colours=>\@colours};
}
write_json("$R/betap.json", \@out);
my $n=0; $n+=@{$_->{colours}} for @out;
my $nc=grep { !defined $_->{code} } map { @{$_->{colours}} } @out;
printf "betap: %d collections, %d colours (%d without code)\n", scalar(@out), $n, $nc;
print "skipped: $_\n" for @skipped;
